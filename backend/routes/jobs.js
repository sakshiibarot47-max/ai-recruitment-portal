const express = require('express');
const db = require('../database');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// POST /jobs  (recruiter only)
router.post('/', verifyToken, requireRole('recruiter'), (req, res) => {
  const { title, company, location, type, skills, description } = req.body;

  if (!title || !company || !skills || !description) {
    return res.status(400).json({ message: 'title, company, skills and description are required' });
  }

  const result = db
    .prepare(
      'INSERT INTO jobs (title, company, location, type, skills, description, recruiter_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .run(title, company, location || null, type || null, skills, description, req.user.id);

  res.status(201).json({ message: 'Job posted', jobId: result.lastInsertRowid });
});

// GET /jobs?search=&location=&type=
router.get('/', (req, res) => {
  const { search, location, type } = req.query;

  let sql = 'SELECT * FROM jobs WHERE 1=1';
  const params = [];

  if (search) {
    sql += ' AND (title LIKE ? OR skills LIKE ? OR company LIKE ?)';
    const s = '%' + search + '%';
    params.push(s, s, s);
  }
  if (location) {
    sql += ' AND location LIKE ?';
    params.push('%' + location + '%');
  }
  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }

  sql += ' ORDER BY id DESC';

  const jobs = db.prepare(sql).all(...params);
  res.json(jobs);
});

// GET /jobs/:id
router.get('/:id', (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);

  if (!job) {
    return res.status(404).json({ message: 'Job not found' });
  }
  res.json(job);
});

// GET /jobs/:id/applicants  (recruiter only, only for their own job)
router.get('/:id/applicants', verifyToken, requireRole('recruiter'), (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);

  if (!job) {
    return res.status(404).json({ message: 'Job not found' });
  }
  if (job.recruiter_id !== req.user.id) {
    return res.status(403).json({ message: 'This is not your job' });
  }

  const applicants = db
    .prepare(
      `SELECT a.id AS application_id, u.name, u.email, a.resume_path,
              a.status, a.match_score, a.applied_at
       FROM applications a
       JOIN users u ON u.id = a.candidate_id
       WHERE a.job_id = ?
       ORDER BY a.match_score DESC, a.applied_at DESC`
    )
    .all(req.params.id);

  res.json(applicants);
});
module.exports = router;
