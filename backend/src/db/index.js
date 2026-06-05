// src/db/index.js
require('dotenv').config();

const USE_POSTGRES = process.env.USE_POSTGRES === 'true' || !!process.env.DATABASE_URL;

let db;

if (USE_POSTGRES) {
  const { Pool } = require('pg');
  const pool = new Pool(
    process.env.DATABASE_URL
      ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
      : {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          database: process.env.DB_NAME || 'voluntariar',
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD,
        }
  );

  db = {
    type: 'postgres',
    query: (sql, params) => pool.query(sql, params),
    run: async (sql, params) => {
      const res = await pool.query(sql, params);
      return { lastID: res.rows[0]?.id ?? null, changes: res.rowCount };
    },
    get: async (sql, params) => {
      const res = await pool.query(sql + (sql.toLowerCase().includes('limit') ? '' : ' LIMIT 1'), params);
      return res.rows[0];
    },
    all: async (sql, params) => {
      const res = await pool.query(sql, params);
      return res.rows;
    },
    pool,
  };

  console.log('🐘 Conectado a PostgreSQL');
} else {
  const Database = require('better-sqlite3');
  const path = require('path');
  const fs = require('fs');

  const DATA_DIR = path.join(__dirname, '../../data');
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const sqlite = new Database(path.join(DATA_DIR, 'voluntariar.sqlite'));
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  // Detecta si la query devuelve filas o no
  function isReadQuery(sql) {
    const s = sql.trimStart().toUpperCase();
    return s.startsWith('SELECT') || s.startsWith('WITH');
  }

  // Traduce $1,$2... → ? para SQLite y quita cláusulas no soportadas
  function translatePg(sql, params) {
    let translated = sql
      .replace(/\$\d+/g, '?')                    // $1 → ?
      .replace(/\bRETURNING\b.*/is, '')           // SQLite no soporta RETURNING
      .replace(/\bON CONFLICT DO NOTHING\b/gi, 'OR IGNORE')   // conflict syntax
      .replace(/\bINSERT INTO\b/gi, 'INSERT OR IGNORE INTO')  // fallback para ON CONFLICT
      .replace(/INSERT OR IGNORE OR IGNORE INTO/gi, 'INSERT OR IGNORE INTO') // evitar doble
      .replace(/CURRENT_TIMESTAMP/gi, "datetime('now')")
      .replace(/ILIKE/gi, 'LIKE');               // SQLite no tiene ILIKE
    return { sql: translated, params };
  }

  db = {
    type: 'sqlite',

    // query(): para SELECT devuelve { rows }, para DDL/DML también
    query: async (sql, params = []) => {
      const t = translatePg(sql, params);
      const stmt = sqlite.prepare(t.sql);
      if (isReadQuery(t.sql)) {
        return { rows: stmt.all(...t.params) };
      } else {
        const info = stmt.run(...t.params);
        return { rows: [], changes: info.changes, lastID: info.lastInsertRowid };
      }
    },

    // run(): siempre ejecuta sin devolver filas
    run: async (sql, params = []) => {
      const t = translatePg(sql, params);
      const stmt = sqlite.prepare(t.sql);
      const info = stmt.run(...t.params);
      return { lastID: info.lastInsertRowid, changes: info.changes };
    },

    // get(): devuelve primera fila o undefined
    get: async (sql, params = []) => {
      const t = translatePg(sql, params);
      const stmt = sqlite.prepare(t.sql);
      return stmt.get(...t.params);
    },

    // all(): devuelve todas las filas
    all: async (sql, params = []) => {
      const t = translatePg(sql, params);
      const stmt = sqlite.prepare(t.sql);
      return stmt.all(...t.params);
    },

    sqlite,
  };

  console.log('🗄️  Conectado a SQLite (local)');
}

module.exports = db;
