// scripts/migrate.js
require('dotenv').config();
const db = require('../src/db');

async function migrate() {
  console.log('🔧 Ejecutando migraciones...');

  const isPg = db.type === 'postgres';

  // Tipo de dato para IDs y timestamps
  const TEXT    = isPg ? 'TEXT'      : 'TEXT';
  const UUID_PK = isPg ? 'TEXT PRIMARY KEY DEFAULT gen_random_uuid()' : "TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))";
  const NOW     = isPg ? 'TIMESTAMPTZ DEFAULT NOW()' : "DATETIME DEFAULT (datetime('now'))";
  const BOOL    = isPg ? 'BOOLEAN'   : 'INTEGER'; // SQLite uses 0/1

  const tables = [
    // ── usuarios ──────────────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS users (
      id          ${UUID_PK},
      name        TEXT NOT NULL,
      email       TEXT NOT NULL UNIQUE,
      password    TEXT NOT NULL,
      role        TEXT NOT NULL DEFAULT 'volunteer',  -- volunteer | ngo | company
      avatar      TEXT,
      bio         TEXT,
      location    TEXT,
      created_at  ${NOW},
      updated_at  ${NOW}
    )`,

    // ── ONGs ─────────────────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS ngos (
      id              ${UUID_PK},
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name            TEXT NOT NULL,
      logo            TEXT,
      cover_image     TEXT,
      category        TEXT,
      description     TEXT,
      mission         TEXT,
      founded         TEXT,
      location        TEXT,
      followers       INTEGER DEFAULT 0,
      created_at      ${NOW}
    )`,

    // ── Empresas ──────────────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS companies (
      id              ${UUID_PK},
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name            TEXT NOT NULL,
      logo            TEXT,
      cover_image     TEXT,
      industry        TEXT,
      description     TEXT,
      followers       INTEGER DEFAULT 0,
      created_at      ${NOW}
    )`,

    // ── Proyectos / Acciones Sociales ─────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS projects (
      id                  ${UUID_PK},
      ngo_id              TEXT NOT NULL REFERENCES ngos(id) ON DELETE CASCADE,
      title               TEXT NOT NULL,
      description         TEXT NOT NULL,
      full_description    TEXT,
      image               TEXT,
      category            TEXT NOT NULL,
      location            TEXT NOT NULL,
      duration            TEXT,
      type                TEXT NOT NULL DEFAULT 'fugaz',  -- fugaz | sostenido
      status              TEXT NOT NULL DEFAULT 'active', -- active | completed
      volunteers_needed   INTEGER DEFAULT 0,
      current_volunteers  INTEGER DEFAULT 0,
      funding_goal        REAL DEFAULT 0,
      current_funding     REAL DEFAULT 0,
      cost_per_person     REAL DEFAULT 0,
      hours_per_week      INTEGER,
      roles_needed        TEXT,   -- JSON array serializado
      requirements        TEXT,   -- JSON array serializado
      followers           INTEGER DEFAULT 0,
      created_at          ${NOW},
      updated_at          ${NOW}
    )`,

    // ── Inscripciones a proyectos ─────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS enrollments (
      id          ${UUID_PK},
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      status      TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
      message     TEXT,
      created_at  ${NOW},
      updated_at  ${NOW},
      UNIQUE(user_id, project_id)
    )`,

    // ── Seguidores de proyectos ───────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS project_follows (
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      created_at  ${NOW},
      PRIMARY KEY (user_id, project_id)
    )`,

    // ── Seguidores de ONGs ────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS ngo_follows (
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ngo_id      TEXT NOT NULL REFERENCES ngos(id) ON DELETE CASCADE,
      created_at  ${NOW},
      PRIMARY KEY (user_id, ngo_id)
    )`,

    // ── Comentarios en proyectos ──────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS comments (
      id          ${UUID_PK},
      project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      comment     TEXT NOT NULL,
      created_at  ${NOW}
    )`,

    // ── Calificaciones de proyectos ───────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS ratings (
      id          ${UUID_PK},
      project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating      INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment     TEXT,
      created_at  ${NOW},
      UNIQUE(user_id, project_id)
    )`,

    // ── Notificaciones ────────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS notifications (
      id          ${UUID_PK},
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type        TEXT NOT NULL,   -- enrollment_approved | enrollment_rejected | new_project | etc.
      title       TEXT NOT NULL,
      body        TEXT,
      read        ${BOOL} DEFAULT ${isPg ? 'false' : '0'},
      data        TEXT,            -- JSON extra
      created_at  ${NOW}
    )`,
  ];

  for (const sql of tables) {
    await db.query(sql);
    console.log('  ✅ Tabla creada/verificada');
  }

  console.log('✅ Migraciones completadas');
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Error en migraciones:', err.message);
  process.exit(1);
});
