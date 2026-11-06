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

// GET /jobs?search=&location=&type=&sort=&page=&limit=  (public)
// Always returns an array of jobs. The total number of matching jobs is sent in the
// reply header X-Total-Count (and X-Total-Pages when page or limit is used).
router.get('/', (req, res) => {
  const { search, location, type, sort } = req.query;

  // Sorting: only these words are allowed (this keeps the SQL safe)
  const SORTS = {
    newest: 'id DESC',
    oldest: 'id ASC',
    title: 'title COLLATE NOCASE ASC',
    company: 'company COLLATE NOCASE ASC',
  };
  if (sort !== undefined && !SORTS[sort]) {
    return res.status(400).json({ message: 'sort must be one of: ' + Object.keys(SORTS).join(', ') });
  }
  const orderBy = SORTS[sort] || SORTS.newest;

  // Filters
  let where = ' WHERE 1=1';
  const params = [];

  if (search) {
    where += ' AND (title LIKE ? OR skills LIKE ? OR company LIKE ?)';
    const s = '%' + search + '%';
    params.push(s, s, s);
  }
  if (location) {
    where += ' AND location LIKE ?';
    params.push('%' + location + '%');
  }
  if (type) {
    where += ' AND type = ?';
    params.push(type);
  }

  const total = db.prepare('SELECT COUNT(*) AS total FROM jobs' + where).get(...params).total;
  res.set('X-Total-Count', String(total));

  let sql = 'SELECT * FROM jobs' + where + ' ORDER BY ' + orderBy;
  const listParams = [...params];

  // Pagination (only when page or limit is sent)
  if (req.query.page !== undefined || req.query.limit !== undefined) {
    const page = req.query.page === undefined ? 1 : Number(req.query.page);
    const limit = req.query.limit === undefined ? 10 : Number(req.query.limit);

    if (!Number.isInteger(page) || page < 1) {
      return res.status(400).json({ message: 'page must be a whole number, 1 or more' });
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
      return res.status(400).json({ message: 'limit must be a whole number from 1 to 50' });
    }

    sql += ' LIMIT ? OFFSET ?';
    listParams.push(limit, (page - 1) * limit);
    res.set('X-Total-Pages', String(Math.max(1, Math.ceil(total / limit))));
  }

  res.json(db.prepare(sql).all(...listParams));
});

// GET /jobs/filters  (public: the values for the filter dropdowns)
// यह राउट हमेशा GET /jobs/:id से ऊपर होना चाहिए!
router.get('/filters', (req, res) => {
  const locations = db
    .prepare("SELECT DISTINCT location FROM jobs WHERE location IS NOT NULL AND location != '' ORDER BY location COLLATE NOCASE")
    .all()
    .map((row) => row.location);
  const types = db
    .prepare("SELECT DISTINCT type FROM jobs WHERE type IS NOT NULL AND type != '' ORDER BY type COLLATE NOCASE")
    .all()
    .map((row) => row.type);
  res.json({ locations, types });
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