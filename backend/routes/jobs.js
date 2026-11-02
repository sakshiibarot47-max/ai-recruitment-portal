const express = require('express');
const db = require('../database');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// POST /jobs  (recruiter only)
router.post('/', verifyToken, requireRole('recruiter'), (req, res) => {
  const { title, company, location, type, skills, description } = req.body || {};

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

// GET /jobs?search=&location=&type=  (public)
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

// GET /jobs/:id  (public)
router.get('/:id', (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);

  if (!job) {
    return res.status(404).json({ message: 'Job not found' });
  }
  res.json(job);
});

// GET /jobs/:id/applicants  (recruiter only, only own job, best match first)
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
      `SELECT a.id AS application_id, u.id AS candidate_id, u.name, u.email, a.resume_path,
              a.status, a.match_score, a.ai_summary, a.applied_at
       FROM applications a
       JOIN users u ON u.id = a.candidate_id
       WHERE a.job_id = ?
       ORDER BY a.match_score DESC, a.applied_at DESC`
    )
    .all(req.params.id);

  res.json(applicants);
});

// PUT /jobs/:id  (recruiter only, only own job). Send only the fields you want to change.
router.put('/:id', verifyToken, requireRole('recruiter'), (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);

  if (!job) {
    return res.status(404).json({ message: 'Job not found' });
  }
  if (job.recruiter_id !== req.user.id) {
    return res.status(403).json({ message: 'This is not your job' });
  }

  const body = req.body || {};
  const updated = {
    title: body.title !== undefined ? body.title : job.title,
    company: body.company !== undefined ? body.company : job.company,
    location: body.location !== undefined ? body.location : job.location,
    type: body.type !== undefined ? body.type : job.type,
    skills: body.skills !== undefined ? body.skills : job.skills,
    description: body.description !== undefined ? body.description : job.description,
  };

  // These four cannot be empty
  for (const field of ['title', 'company', 'skills', 'description']) {
    if (typeof updated[field] !== 'string' || updated[field].trim() === '') {
      return res.status(400).json({ message: field + ' cannot be empty' });
    }
  }

  db.prepare(
    'UPDATE jobs SET title = ?, company = ?, location = ?, type = ?, skills = ?, description = ? WHERE id = ?'
  ).run(
    updated.title.trim(),
    updated.company.trim(),
    updated.location || null,
    updated.type || null,
    updated.skills.trim(),
    updated.description.trim(),
    req.params.id
  );

  const saved = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
  res.json({ message: 'Job updated', job: saved });
});

// DELETE /jobs/:id  (recruiter only, only own job, only if nobody has applied)
router.delete('/:id', verifyToken, requireRole('recruiter'), (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);

  if (!job) {
    return res.status(404).json({ message: 'Job not found' });
  }
  if (job.recruiter_id !== req.user.id) {
    return res.status(403).json({ message: 'This is not your job' });
  }

  const count = db
    .prepare('SELECT COUNT(*) AS total FROM applications WHERE job_id = ?')
    .get(req.params.id).total;
  if (count > 0) {
    return res.status(409).json({ message: 'This job has applications and cannot be deleted' });
  }

  db.prepare('DELETE FROM jobs WHERE id = ?').run(req.params.id);
  res.json({ message: 'Job deleted' });
});

module.exports = router;