


const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../database');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// DELETE /my/applications/:id  (candidate only: withdraw their own application)
// Allowed only while the status is still "Applied" (the recruiter has not reviewed it yet).
router.delete('/applications/:id', verifyToken, requireRole('candidate'), (req, res) => {
  const application = db
    .prepare('SELECT id, candidate_id, status, resume_path FROM applications WHERE id = ?')
    .get(req.params.id);

  if (!application) {
    return res.status(404).json({ message: 'Application not found' });
  }
  if (application.candidate_id !== req.user.id) {
    return res.status(403).json({ message: 'This is not your application' });
  }
  if (application.status !== 'Applied') {
    return res
      .status(409)
      .json({ message: 'You can only withdraw an application that has not been reviewed yet' });
  }

  db.prepare('DELETE FROM applications WHERE id = ?').run(application.id);

  // Remove the saved resume file too (if it is already gone, ignore it)
  try {
    fs.unlinkSync(path.join(__dirname, '..', application.resume_path));
  } catch (err) {
    // nothing to remove
  }

  res.json({ message: 'Application withdrawn' });
});

module.exports = router;
