const express = require('express');
const db = require('../database');
const { verifyToken, requireRole } = require('../middleware/auth');
const { calculateMatch } = require('../utils/matcher');

const router = express.Router();

// GET /recommendations/jobs  (candidate only)
// "Jobs for you": jobs whose required skills match the skills saved in the candidate's profile.
router.get('/jobs', verifyToken, requireRole('candidate'), (req, res) => {
  const profile = db.prepare('SELECT skills FROM profiles WHERE user_id = ?').get(req.user.id);

  // No skills saved yet, so there is nothing to match
  if (!profile || !profile.skills || profile.skills.trim() === '') {
    return res.json([]);
  }

  // Only jobs the candidate has not applied to yet
  const jobs = db
    .prepare(
      'SELECT * FROM jobs WHERE id NOT IN (SELECT job_id FROM applications WHERE candidate_id = ?)'
    )
    .all(req.user.id);

  const ranked = jobs
    .map((job) => {
      // Reuse the same matching as the resume score: required skills found in the candidate's skills
      const result = calculateMatch(profile.skills, job.skills);
      return {
        ...job,
        matchScore: result.score,
        matchedSkills: result.matched,
        missingSkills: result.missing,
      };
    })
    .filter((job) => job.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore || b.id - a.id)
    .slice(0, 10);

  res.json(ranked);
});

module.exports = router;