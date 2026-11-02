const express = require('express');
const db = require('../database');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

const STATUSES = ['Applied', 'Shortlisted', 'Interview', 'Offer', 'Rejected'];

// GET /recruiter/jobs (recruiter only: their own jobs, with applicant numbers)
router.get('/jobs', verifyToken, requireRole('recruiter'), (req, res) => {
  const jobs = db
    .prepare(
      `SELECT j.*,
        (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS applicant_count,
        (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id AND a.status = 'Shortlisted') AS shortlisted_count
       FROM jobs j
       WHERE j.recruiter_id = ?
       ORDER BY j.id DESC`
    )
    .all(req.user.id);
  res.json(jobs);
});

// GET /recruiter/stats (recruiter only: numbers for the dashboard)
router.get('/stats', verifyToken, requireRole('recruiter'), (req, res) => {
  const totalJobs = db
    .prepare('SELECT COUNT(*) AS total FROM jobs WHERE recruiter_id = ?')
    .get(req.user.id).total;

  const rows = db
    .prepare(
      `SELECT a.status, COUNT(*) AS total, AVG(a.match_score) AS average_score
       FROM applications a JOIN jobs j ON j.id = a.job_id
       WHERE j.recruiter_id = ?
       GROUP BY a.status`
    )
    .all(req.user.id);

  const byStatus = {};
  STATUSES.forEach((s) => (byStatus[s] = 0));
  let totalApplicants = 0;
  rows.forEach((r) => {
    byStatus[r.status] = r.total;
    totalApplicants += r.total;
  });

  const scoreRow = db
    .prepare(
      `SELECT AVG(a.match_score) AS average_score
       FROM applications a JOIN jobs j ON j.id = a.job_id
       WHERE j.recruiter_id = ? AND a.match_score IS NOT NULL`
    )
    .get(req.user.id);

  // Interviews that are still to come (time format: 2026-11-05 14:30)
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const nowText =
    now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) +
    ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes());

  const upcoming = db
    .prepare(
      `SELECT COUNT(*) AS total
       FROM interviews i
       JOIN applications a ON a.id = i.application_id
       JOIN jobs j ON j.id = a.job_id
       WHERE j.recruiter_id = ? AND i.scheduled_at >= ?`
    )
    .get(req.user.id, nowText).total;

  res.json({
    total_jobs: totalJobs,
    total_applicants: totalApplicants,
    by_status: byStatus,
    average_match_score: scoreRow.average_score === null ? null : Math.round(scoreRow.average_score),
    upcoming_interviews: upcoming,
  });
});

module.exports = router;