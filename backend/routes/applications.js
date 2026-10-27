const express = require('express');
const db = require('../database');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const ALLOWED = ['Applied', 'Shortlisted', 'Interview', 'Offer', 'Rejected'];

// PUT /applications/:id/status  (recruiter only, only for their own jobs)
router.put('/:id/status', verifyToken, requireRole('recruiter'), (req, res) => {
  const { status } = req.body;

  if (!ALLOWED.includes(status)) {
    return res.status(400).json({ message: 'Status must be one of: ' + ALLOWED.join(', ') });
  }

  const application = db
    .prepare(
      'SELECT a.id, j.recruiter_id FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.id = ?'
    )
    .get(req.params.id);

  if (!application) {
    return res.status(404).json({ message: 'Application not found' });
  }
  if (application.recruiter_id !== req.user.id) {
    return res.status(403).json({ message: 'This application is not for your job' });
  }

  db.prepare('UPDATE applications SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ message: 'Status updated', status });
});

module.exports = router;