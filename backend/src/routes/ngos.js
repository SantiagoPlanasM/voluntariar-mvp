// src/routes/ngos.js
const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/ngos ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const ngos = await db.all(
      'SELECT id, name, logo, cover_image, category, description, followers, location FROM ngos ORDER BY followers DESC',
      []
    );
    res.json({ ngos });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener ONGs' });
  }
});

// ── GET /api/ngos/me  (perfil propio de la ONG autenticada) ───────────────
router.get('/me', requireAuth, requireRole('ngo'), async (req, res) => {
  try {
    const ngo = await db.get('SELECT * FROM ngos WHERE user_id=$1', [req.user.id]);
    if (!ngo) return res.status(404).json({ error: 'Perfil ONG no encontrado' });

    const projects = await db.all(
      'SELECT * FROM projects WHERE ngo_id=$1 ORDER BY created_at DESC',
      [ngo.id]
    );

    const stats = {
      total_projects: projects.length,
      active_projects: projects.filter(p => p.status === 'active').length,
      total_volunteers: projects.reduce((s, p) => s + (p.current_volunteers || 0), 0),
    };

    res.json({ ngo, projects, stats });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

// ── GET /api/ngos/:id ─────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const ngo = await db.get('SELECT * FROM ngos WHERE id=$1', [req.params.id]);
    if (!ngo) return res.status(404).json({ error: 'ONG no encontrada' });

    const projects = await db.all(
      `SELECT id, title, image, category, type, status, current_volunteers, volunteers_needed
       FROM projects WHERE ngo_id=$1 ORDER BY created_at DESC`,
      [ngo.id]
    );

    res.json({ ngo, projects });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener ONG' });
  }
});

// ── PUT /api/ngos/me ──────────────────────────────────────────────────────
router.put('/me', requireAuth, requireRole('ngo'), async (req, res) => {
  try {
    const { name, logo, cover_image, category, description, mission, founded, location } = req.body;

    await db.query(
      `UPDATE ngos SET name=$1, logo=$2, cover_image=$3, category=$4, description=$5,
       mission=$6, founded=$7, location=$8 WHERE user_id=$9`,
      [name, logo, cover_image, category, description, mission, founded, location, req.user.id]
    );

    const updated = await db.get('SELECT * FROM ngos WHERE user_id=$1', [req.user.id]);
    res.json({ ngo: updated });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar ONG' });
  }
});

// ── GET /api/ngos/:id/projects ────────────────────────────────────────────
router.get('/:id/projects', async (req, res) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT * FROM projects WHERE ngo_id=$1';
    const params = [req.params.id];
    if (status) { sql += ' AND status=$2'; params.push(status); }
    sql += ' ORDER BY created_at DESC';

    const projects = await db.all(sql, params);
    res.json({ projects });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener proyectos de ONG' });
  }
});

// ── GET /api/ngos/:id/dashboard  (stats para el dashboard de ONG) ─────────
router.get('/:id/dashboard', requireAuth, requireRole('ngo'), async (req, res) => {
  try {
    const ngo = await db.get('SELECT * FROM ngos WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    if (!ngo) return res.status(403).json({ error: 'Sin acceso' });

    const projects = await db.all('SELECT * FROM projects WHERE ngo_id=$1', [req.params.id]);

    // Inscripciones pendientes
    const pending = await db.all(
      `SELECT e.*, u.name AS volunteer_name, u.avatar AS volunteer_avatar, p.title AS project_title
       FROM enrollments e
       JOIN users u ON u.id = e.user_id
       JOIN projects p ON p.id = e.project_id
       WHERE p.ngo_id=$1 AND e.status='pending'
       ORDER BY e.created_at DESC`,
      [req.params.id]
    );

    const stats = {
      total_projects: projects.length,
      active_projects: projects.filter(p => p.status === 'active').length,
      completed_projects: projects.filter(p => p.status === 'completed').length,
      total_volunteers: projects.reduce((s, p) => s + (p.current_volunteers || 0), 0),
      total_funding: projects.reduce((s, p) => s + (p.current_funding || 0), 0),
      pending_enrollments: pending.length,
    };

    res.json({ ngo, projects, pending_enrollments: pending, stats });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener dashboard' });
  }
});

module.exports = router;
