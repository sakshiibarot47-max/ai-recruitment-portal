const express = require('express');
const db = require('../database');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// This table is created here, so database.js does not need to change.
// ON DELETE CASCADE: if a job is deleted, the saved copies of it are removed too.
db.exec(`
CREATE TABLE IF NOT EXISTS saved_jobs (
  user_id INTEGER NOT NULL,
  job_id INTEGER NOT NULL,
  saved_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, job_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);
`);

// GET /saved-jobs  (candidate only: the jobs they saved, newest first)
router.get('/', verifyToken, requireRole('candidate'), (req, res) => {
  const jobs = db
    .prepare(
      `SELECT j.*, s.saved_at
       FROM saved_jobs s
       JOIN jobs j ON j.id = s.job_id
       WHERE s.user_id = ?
       ORDER BY s.saved_at DESC, j.id DESC`
    )
    .all(req.user.id);
  res.json(jobs);
});

// POST /saved-jobs/:jobId  (candidate only: save a job)
router.post('/:jobId', verifyToken, requireRole('candidate'), (req, res) => {
  const job = db.prepare('SELECT id FROM jobs WHERE id = ?').get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ message: 'Job not found' });
  }

  const result = db
    .prepare('INSERT OR IGNORE INTO saved_jobs (user_id, job_id) VALUES (?, ?)')
    .run(req.user.id, job.id);

  if (result.changes === 0) {
    return res.json({ message: 'Job already saved' });
  }
  res.status(201).json({ message: 'Job saved' });
});

// DELETE /saved-jobs/:jobId  (candidate only: remove a saved job)
router.delete('/:jobId', verifyToken, requireRole('candidate'), (req, res) => {
  const result = db
    .prepare('DELETE FROM saved_jobs WHERE user_id = ? AND job_id = ?')
    .run(req.user.id, req.params.jobId);

  if (result.changes === 0) {
    return res.status(404).json({ message: 'Saved job not found' });
  }
  res.json({ message: 'Job removed from saved jobs' });
});

module.exports = router;

