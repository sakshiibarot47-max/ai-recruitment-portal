const express = require('express');
const db = require('../database');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// This table is created here, so database.js does not need to change
db.exec(`
CREATE TABLE IF NOT EXISTS profiles (
  user_id INTEGER PRIMARY KEY,
  phone TEXT,
  location TEXT,
  headline TEXT,
  skills TEXT,
  education TEXT,
  experience TEXT,
  projects TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`);

// The fields a candidate can save, and the longest text allowed for each
const MAX_LENGTH = {
  phone: 20,
  location: 100,
  headline: 150,
  skills: 500,
  education: 2000,
  experience: 3000,
  projects: 3000,
};
const FIELDS = Object.keys(MAX_LENGTH);

// "React,  css, React" becomes "react, css"
function cleanSkills(text) {
  const list = String(text)
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
  return [...new Set(list)].join(', ');
}

// How much of the profile is filled in (0 to 100)
function completeness(profile) {
  const filled = FIELDS.filter((f) => profile[f] && String(profile[f]).trim() !== '').length;
  return Math.round((filled / FIELDS.length) * 100);
}

// Builds the reply for one candidate
function buildProfile(userId) {
  const user = db.prepare('SELECT name, email FROM users WHERE id = ?').get(userId);
  const row = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId) || {};

  const profile = { name: user.name, email: user.email };
  FIELDS.forEach((f) => {
    profile[f] = row[f] || '';
  });
  profile.completeness = completeness(profile);
  return profile;
}

// GET /profile/me  (candidate only)
router.get('/me', verifyToken, requireRole('candidate'), (req, res) => {
  res.json(buildProfile(req.user.id));
});

// PUT /profile/me  (candidate only). Send only the fields you want to change.
router.put('/me', verifyToken, requireRole('candidate'), (req, res) => {
  const body = req.body || {};
  const existing = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.user.id) || {};
  const values = {};

  for (const field of FIELDS) {
    let value = body[field] !== undefined ? body[field] : existing[field] || '';

    if (value === null) value = '';
    if (typeof value !== 'string') {
      return res.status(400).json({ message: field + ' must be text' });
    }

    value = value.trim();
    if (field === 'skills') value = cleanSkills(value);

    if (value.length > MAX_LENGTH[field]) {
      return res
        .status(400)
        .json({ message: field + ' is too long (maximum ' + MAX_LENGTH[field] + ' characters)' });
    }
    values[field] = value;
  }

  db.prepare(
    `INSERT INTO profiles (user_id, phone, location, headline, skills, education, experience, projects, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id) DO UPDATE SET
       phone = excluded.phone,
       location = excluded.location,
       headline = excluded.headline,
       skills = excluded.skills,
       education = excluded.education,
       experience = excluded.experience,
       projects = excluded.projects,
       updated_at = CURRENT_TIMESTAMP`
  ).run(
    req.user.id,
    values.phone,
    values.location,
    values.headline,
    values.skills,
    values.education,
    values.experience,
    values.projects
  );

  res.json({ message: 'Profile saved', profile: buildProfile(req.user.id) });
});

module.exports = router;