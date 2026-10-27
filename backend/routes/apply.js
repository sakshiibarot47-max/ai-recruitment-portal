const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Folder where resumes are saved
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
});

// Only PDF files, max 5 MB
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') cb(null, true);
  else cb(new Error('Only PDF files are allowed'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// POST /jobs/:id/apply  (candidate only, form-data, key: resume)
router.post(
  '/jobs/:id/apply',
  verifyToken,
  requireRole('candidate'),
  upload.single('resume'),
  (req, res) => {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);

    if (!job) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Job not found' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a PDF resume' });
    }

    const already = db
      .prepare('SELECT id FROM applications WHERE job_id = ? AND candidate_id = ?')
      .get(job.id, req.user.id);
    if (already) {
      fs.unlinkSync(req.file.path);
      return res.status(409).json({ message: 'You already applied to this job' });
    }

    const result = db
      .prepare('INSERT INTO applications (job_id, candidate_id, resume_path) VALUES (?, ?, ?)')
      .run(job.id, req.user.id, 'uploads/' + req.file.filename);

    res.status(201).json({
      message: 'Application submitted',
      applicationId: result.lastInsertRowid
    });
  }
);

// GET /my/applications  (candidate only)
router.get('/my/applications', verifyToken, requireRole('candidate'), (req, res) => {
  const rows = db
    .prepare(
      'SELECT a.id, j.title, j.company, a.status, a.match_score, a.applied_at ' +
      'FROM applications a JOIN jobs j ON j.id = a.job_id ' +
      'WHERE a.candidate_id = ? ORDER BY a.applied_at DESC'
    )
    .all(req.user.id);
  res.json(rows);
});

// Clear message for upload errors (wrong file type, too big)
router.use((err, req, res, next) => {
  res.status(400).json({ message: err.message });
});

module.exports = router;
