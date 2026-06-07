// src/routes/projects.js
const express = require('express');
const db = require('../db');
const { requireAuth, optionalAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

const parseJson = (val) => { try { return JSON.parse(val || '[]'); } catch { return []; } };
const fmt = (p) => ({
  ...p,
  roles_needed:  parseJson(p.roles_needed),
  requirements:  parseJson(p.requirements),
  hours_per_week: p.hours_per_week ?? null,
  current_funding: p.current_funding  || 0,
  funding_goal:    p.funding_goal     || 0,
  current_volunteers: p.current_volunteers || 0,
  volunteers_needed:  p.volunteers_needed  || 0,
});

// ── Validación de proyecto ────────────────────────────────────────────────
function validateProject(body) {
  const { title, description, category, location, type, duration, hours_per_week, volunteers_needed } = body;
  if (!title || title.trim().length < 3)       return 'El título debe tener al menos 3 caracteres';
  if (!description || description.trim().length < 10) return 'La descripción debe tener al menos 10 caracteres';
  if (!category)                                return 'Seleccioná una categoría';
  if (!location || location.trim().length < 2)  return 'La ubicación es obligatoria (podés poner "Remoto")';
  if (type === 'fugaz' && (!duration || duration.trim().length < 2))
    return 'La duración es obligatoria para voluntariados fugaces';
  if (type === 'sostenido') {
    const h = parseInt(hours_per_week);
    if (!hours_per_week || isNaN(h) || h < 1) return 'Las horas semanales deben ser un número positivo';
  }
  const v = parseInt(volunteers_needed);
  if (!volunteers_needed || isNaN(v) || v < 1) return 'Los voluntarios necesarios deben ser un número positivo';
  return null;
}

// ── GET /api/projects ─────────────────────────────────────────────────────
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, type, status, search, limit = 20, offset = 0 } = req.query;
    let sql = `SELECT p.*, n.name AS ngo_name, n.logo AS ngo_logo FROM projects p JOIN ngos n ON n.id = p.ngo_id WHERE 1=1`;
    const params = [];
    let i = 1;

    if (category && category !== 'Todos') { sql += ` AND p.category = $${i++}`; params.push(category); }
    if (type && type !== 'Todos')         { sql += ` AND p.type = $${i++}`;     params.push(type); }
    if (status)                           { sql += ` AND p.status = $${i++}`;   params.push(status); }
    if (search && search.trim()) {
      // Push the param once per placeholder (SQLite requires one binding per ?)
      const q = `%${search.trim()}%`;
      sql += ` AND (p.title LIKE $${i++} OR p.description LIKE $${i++} OR n.name LIKE $${i++} OR p.category LIKE $${i++} OR p.location LIKE $${i++})`;
      params.push(q, q, q, q, q);
    }
    sql += ` ORDER BY p.created_at DESC LIMIT $${i++} OFFSET $${i++}`;
    params.push(parseInt(limit), parseInt(offset));

    const { rows } = await db.query(sql, params);
    res.json({ projects: rows.map(fmt) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener proyectos' });
  }
});

// ── GET /api/projects/:id ─────────────────────────────────────────────────
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const project = await db.get(
      `SELECT p.*, n.name AS ngo_name, n.logo AS ngo_logo, n.category AS ngo_category
       FROM projects p JOIN ngos n ON n.id = p.ngo_id WHERE p.id = $1`,
      [req.params.id]
    );
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

    const comments = await db.all(
      `SELECT c.*, u.name AS user_name, u.avatar AS user_avatar FROM comments c JOIN users u ON u.id = c.user_id WHERE c.project_id = $1 ORDER BY c.created_at DESC`,
      [req.params.id]
    );
    const ratings = await db.all(
      `SELECT r.*, u.name AS user_name FROM ratings r JOIN users u ON u.id = r.user_id WHERE r.project_id = $1`,
      [req.params.id]
    );
    const avgRating = ratings.length ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : 0;

    let myEnrollment = null;
    if (req.user) {
      myEnrollment = await db.get('SELECT * FROM enrollments WHERE user_id=$1 AND project_id=$2', [req.user.id, req.params.id]);
    }

    res.json({ project: { ...fmt(project), comments, ratings, avg_rating: Math.round(avgRating * 10) / 10, my_enrollment: myEnrollment } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener proyecto' });
  }
});

// ── POST /api/projects ────────────────────────────────────────────────────
router.post('/', requireAuth, requireRole('ngo'), async (req, res) => {
  try {
    const ngo = await db.get('SELECT id FROM ngos WHERE user_id=$1', [req.user.id]);
    if (!ngo) return res.status(404).json({ error: 'Perfil ONG no encontrado' });

    const err = validateProject(req.body);
    if (err) return res.status(400).json({ error: err });

    const { title, description, full_description, image, category, location, duration, type,
            volunteers_needed, funding_goal, cost_per_person, hours_per_week, roles_needed, requirements } = req.body;

    // Validar roles y requisitos
    const rolesArr = Array.isArray(roles_needed) ? roles_needed.filter(r => r && r.trim().length >= 2) : [];
    const reqArr   = Array.isArray(requirements)  ? requirements.filter(r => r && r.trim().length >= 2) : [];

    await db.run(
      `INSERT INTO projects (ngo_id, title, description, full_description, image, category, location, duration, type, volunteers_needed, funding_goal, cost_per_person, hours_per_week, roles_needed, requirements)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [ngo.id, title.trim(), description.trim(), full_description?.trim() || null, image || null,
       category, location.trim(), duration?.trim() || null, type || 'fugaz',
       parseInt(volunteers_needed), parseFloat(funding_goal) || 0, parseFloat(cost_per_person) || 0,
       type === 'sostenido' ? parseInt(hours_per_week) : null,
       JSON.stringify(rolesArr), JSON.stringify(reqArr)]
    );

    const project = await db.get('SELECT * FROM projects WHERE ngo_id=$1 ORDER BY created_at DESC LIMIT 1', [ngo.id]);
    res.status(201).json({ project: fmt(project) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear proyecto' });
  }
});

// ── PUT /api/projects/:id ─────────────────────────────────────────────────
router.put('/:id', requireAuth, requireRole('ngo'), async (req, res) => {
  try {
    const ngo = await db.get('SELECT id FROM ngos WHERE user_id=$1', [req.user.id]);
    const project = await db.get('SELECT * FROM projects WHERE id=$1 AND ngo_id=$2', [req.params.id, ngo?.id]);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado o sin permiso' });

    const err = validateProject(req.body);
    if (err) return res.status(400).json({ error: err });

    const { title, description, full_description, image, category, location, duration, type, status,
            volunteers_needed, funding_goal, cost_per_person, hours_per_week, roles_needed, requirements } = req.body;

    const rolesArr = Array.isArray(roles_needed) ? roles_needed.filter(r => r && r.trim().length >= 2) : [];
    const reqArr   = Array.isArray(requirements)  ? requirements.filter(r => r && r.trim().length >= 2) : [];

    await db.run(
      `UPDATE projects SET title=$1, description=$2, full_description=$3, image=$4, category=$5, location=$6,
       duration=$7, type=$8, status=$9, volunteers_needed=$10, funding_goal=$11, cost_per_person=$12,
       hours_per_week=$13, roles_needed=$14, requirements=$15, updated_at=CURRENT_TIMESTAMP WHERE id=$16`,
      [title.trim(), description.trim(), full_description?.trim() || null, image || null, category, location.trim(),
       duration?.trim() || null, type, status || 'active', parseInt(volunteers_needed),
       parseFloat(funding_goal) || 0, parseFloat(cost_per_person) || 0,
       type === 'sostenido' ? parseInt(hours_per_week) : null,
       JSON.stringify(rolesArr), JSON.stringify(reqArr), req.params.id]
    );

    const updated = await db.get('SELECT * FROM projects WHERE id=$1', [req.params.id]);
    res.json({ project: fmt(updated) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar proyecto' });
  }
});

// ── DELETE /api/projects/:id ──────────────────────────────────────────────
router.delete('/:id', requireAuth, requireRole('ngo'), async (req, res) => {
  try {
    const ngo = await db.get('SELECT id FROM ngos WHERE user_id=$1', [req.user.id]);
    const project = await db.get('SELECT id FROM projects WHERE id=$1 AND ngo_id=$2', [req.params.id, ngo?.id]);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado o sin permiso' });
    await db.run('DELETE FROM projects WHERE id=$1', [req.params.id]);
    res.json({ message: 'Proyecto eliminado' });
  } catch (err) { res.status(500).json({ error: 'Error al eliminar' }); }
});

// ── Blacklist básica de palabras ──────────────────────────────────────────
const BLACKLIST = ['pelotudo','boludo','idiota','imbecil','mierda','puto','puta','hdp','hijo de puta','concha','cagon','forro','tarado'];
function containsBadWord(text) {
  const lower = text.toLowerCase();
  return BLACKLIST.some(w => lower.includes(w));
}

// ── POST /api/projects/:id/comments ──────────────────────────────────────
router.post('/:id/comments', requireAuth, async (req, res) => {
  try {
    const { comment } = req.body;
    if (!comment?.trim()) return res.status(400).json({ error: 'Comentario vacío' });
    if (comment.trim().length < 3) return res.status(400).json({ error: 'El comentario es muy corto' });
    if (containsBadWord(comment)) return res.status(400).json({ error: 'El comentario contiene palabras no permitidas' });

    await db.run(`INSERT INTO comments (project_id, user_id, comment) VALUES ($1,$2,$3)`, [req.params.id, req.user.id, comment.trim()]);
    const saved = await db.get(
      `SELECT c.*, u.name AS user_name, u.avatar AS user_avatar FROM comments c JOIN users u ON u.id = c.user_id WHERE c.project_id=$1 AND c.user_id=$2 ORDER BY c.created_at DESC LIMIT 1`,
      [req.params.id, req.user.id]
    );
    res.status(201).json({ comment: saved });
  } catch (err) { res.status(500).json({ error: 'Error al comentar' }); }
});

// ── POST /api/projects/:id/ratings ────────────────────────────────────────
router.post('/:id/ratings', requireAuth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating entre 1 y 5' });

    const existing = await db.get('SELECT id FROM ratings WHERE user_id=$1 AND project_id=$2', [req.user.id, req.params.id]);
    if (existing) {
      await db.run('UPDATE ratings SET rating=$1, comment=$2 WHERE id=$3', [rating, comment, existing.id]);
    } else {
      await db.run(`INSERT INTO ratings (project_id, user_id, rating, comment) VALUES ($1,$2,$3,$4)`, [req.params.id, req.user.id, rating, comment]);
    }
    res.json({ message: 'Calificación guardada' });
  } catch (err) { res.status(500).json({ error: 'Error al calificar' }); }
});

module.exports = router;
