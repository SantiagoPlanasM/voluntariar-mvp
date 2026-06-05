// src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(s => s.trim());

app.use(cors({
  origin: (origin, cb) => {
    // Permitir peticiones sin origin (Postman, curl) y los orígenes configurados
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      cb(null, true);
    } else {
      cb(new Error(`CORS: origen no permitido → ${origin}`));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health check ──────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ── Rutas ─────────────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/projects',      require('./routes/projects'));
app.use('/api/enrollments',   require('./routes/enrollments'));
app.use('/api/ngos',          require('./routes/ngos'));
app.use('/api/notifications',  require('./routes/notifications'));

// ── 404 ───────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
});

// ── Error global ──────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error global:', err.message);
  res.status(500).json({ error: err.message || 'Error interno del servidor' });
});

// ── Start ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 Voluntariar API corriendo en http://localhost:${PORT}`);
  console.log(`   Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   DB:      ${process.env.USE_POSTGRES === 'true' ? 'PostgreSQL' : 'SQLite (local)'}`);
  console.log(`\n📋 Endpoints disponibles:`);
  console.log(`   POST   /api/auth/register`);
  console.log(`   POST   /api/auth/login`);
  console.log(`   GET    /api/auth/me`);
  console.log(`   GET    /api/projects`);
  console.log(`   POST   /api/projects`);
  console.log(`   GET    /api/projects/:id`);
  console.log(`   POST   /api/enrollments`);
  console.log(`   GET    /api/enrollments/my`);
  console.log(`   GET    /api/ngos`);
  console.log(`   GET    /api/ngos/me`);
  console.log(`   GET    /api/notifications`);
  console.log(`   GET    /health\n`);
});

module.exports = app;
