// src/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── Validaciones compartidas ───────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_REGEX  = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]{2,50}$/;

function validateEmail(email) {
  if (!email || !EMAIL_REGEX.test(email.trim())) return 'Email inválido. Ejemplo: usuario@dominio.com';
  return null;
}
function validateName(name) {
  if (!name || name.trim().length < 2) return 'El nombre debe tener al menos 2 caracteres';
  if (!NAME_REGEX.test(name.trim())) return 'El nombre solo puede contener letras y espacios';
  return null;
}
function validatePassword(password) {
  if (!password || password.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
  if (!/[A-Z]/.test(password)) return 'La contraseña debe incluir al menos una mayúscula';
  if (!/[0-9]/.test(password)) return 'La contraseña debe incluir al menos un número';
  return null;
}

// ── POST /api/auth/register ────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'volunteer' } = req.body;

    const nameErr  = validateName(name);
    const emailErr = validateEmail(email);
    const passErr  = validatePassword(password);

    if (nameErr)  return res.status(400).json({ error: nameErr });
    if (emailErr) return res.status(400).json({ error: emailErr });
    if (passErr)  return res.status(400).json({ error: passErr });

    if (!['volunteer', 'ngo', 'company'].includes(role))
      return res.status(400).json({ error: 'Rol inválido' });

    const existing = await db.get('SELECT id FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    if (existing) return res.status(409).json({ error: 'Ya existe una cuenta con ese email' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}`;

    await db.run(
      `INSERT INTO users (name, email, password, role, avatar) VALUES ($1,$2,$3,$4,$5)`,
      [name.trim(), email.trim().toLowerCase(), hashedPassword, role, avatar]
    );

    const user = await db.get('SELECT id, name, email, role, avatar, created_at FROM users WHERE email = $1', [email.trim().toLowerCase()]);

    if (role === 'ngo')     await db.run(`INSERT INTO ngos (user_id, name, logo) VALUES ($1,$2,$3)`, [user.id, name.trim(), avatar]);
    if (role === 'company') await db.run(`INSERT INTO companies (user_id, name, logo) VALUES ($1,$2,$3)`, [user.id, name.trim(), avatar]);

    const token = signToken(user);
    res.status(201).json({ message: 'Cuenta creada', token, user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
  } catch (err) {
    console.error('register error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── POST /api/auth/login ───────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

    const emailErr = validateEmail(email);
    if (emailErr) return res.status(400).json({ error: emailErr });

    const user = await db.get(
      'SELECT id, name, email, password, role, avatar, bio, location FROM users WHERE email = $1',
      [email.trim().toLowerCase()]
    );
    // Mismos mensajes pero diferenciados para UX
    if (!user) return res.status(401).json({ error: 'No encontramos una cuenta con ese email' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Contraseña incorrecta' });

    const token = signToken(user);
    res.json({ message: 'Sesión iniciada', token, user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, bio: user.bio, location: user.location } });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── GET /api/auth/me ───────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await db.get('SELECT id, name, email, role, avatar, bio, location, created_at FROM users WHERE id = $1', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ user });
  } catch (err) { res.status(500).json({ error: 'Error interno' }); }
});

// ── PUT /api/auth/me ───────────────────────────────────────────────────────
router.put('/me', requireAuth, async (req, res) => {
  try {
    const { name, bio, location, avatar } = req.body;
    if (name) {
      const nameErr = validateName(name);
      if (nameErr) return res.status(400).json({ error: nameErr });
    }
    await db.run(
      `UPDATE users SET name=$1, bio=$2, location=$3, avatar=$4, updated_at=CURRENT_TIMESTAMP WHERE id=$5`,
      [name, bio, location, avatar, req.user.id]
    );
    const updated = await db.get('SELECT id, name, email, role, avatar, bio, location FROM users WHERE id = $1', [req.user.id]);
    res.json({ user: updated });
  } catch (err) { res.status(500).json({ error: 'Error interno' }); }
});

module.exports = router;
