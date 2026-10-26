const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database');

const router = express.Router();

// POST /auth/register
router.post('/register', (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  if (!['candidate', 'recruiter'].includes(role)) {
    return res.status(400).json({ message: 'Role must be candidate or recruiter' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ message: 'Email already registered' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = db
    .prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)')
    .run(name, email, hashedPassword, role);

  res.status(201).json({ message: 'Registered successfully', userId: result.lastInsertRowid });
});

module.exports = router;