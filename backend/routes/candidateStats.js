const express = require('express');
const router = express.Router();
const db = require('../database');
const { verifyToken, requireRole } = require('../middleware/auth');

// GET /candidate/stats (Candidate Dashboard Metrics)
router.get('/stats', verifyToken, requireRole('candidate'), (req, res) => {
  try {
    const candidateId = req.user.id;

    // 1. Applications breakdown by status
    const applications = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM applications 
      WHERE candidate_id = ? 
      GROUP BY status
    `).all(candidateId);

    const byStatus = {};
    applications.forEach(row => {
      byStatus[row.status] = row.count;
    });

    // 2. Upcoming interviews
    const upcomingInterviews = db.prepare(`
      SELECT i.*, j.title as job_title, j.company 
      FROM interviews i
      JOIN applications a ON i.application_id = a.id
      JOIN jobs j ON a.job_id = j.id
      WHERE a.candidate_id = ? AND i.scheduled_at >= datetime('now')
      ORDER BY i.scheduled_at ASC
    `).all(candidateId);

    // 3. Saved jobs count (safe check if saved_jobs table exists)
    let savedJobsCount = 0;
    try {
      const saved = db.prepare(`
        SELECT COUNT(*) as count FROM saved_jobs WHERE candidate_id = ?
      `).get(candidateId);
      if (saved) savedJobsCount = saved.count;
    } catch (e) {
      // default to 0 if table doesn't exist
    }

    // 4. Profile completeness calculation
    const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(candidateId);
    let filledFields = 0;
    const totalFields = 4; // name, email, etc.
    if (user && user.name) filledFields++;
    if (user && user.email) filledFields++;
    const profileCompleteness = Math.round((filledFields / totalFields) * 100);

    res.json({
      applications_by_status: byStatus,
      upcoming_interviews: upcomingInterviews,
      saved_jobs_count: savedJobsCount,
      profile_completeness: `${profileCompleteness}%`
    });

  } catch (err) {
    console.error('Error fetching candidate stats:', err.message);
    res.status(500).json({ message: 'Server error while fetching candidate stats' });
  }
});

module.exports = router;