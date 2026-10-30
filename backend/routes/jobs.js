const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database');
const { verifyToken, requireRole } = require('../middleware/auth');
const { PDFParse } = require('pdf-parse');
const { calculateMatch } = require('../utils/matcher');
const sendMail = require('../utils/mailer'); // ✅ Make sure mailer is imported

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') cb(null, true);
  else cb(new Error('Only PDF files are allowed'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// GET /jobs - List all jobs
router.get('/', (req, res) => {
  try {
    const jobs = db.prepare('SELECT * FROM jobs ORDER BY id DESC').all();
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /jobs - Recruiter creates a job
router.post('/', verifyToken, requireRole('recruiter'), (req, res) => {
  try {
    const { title, company, location, type, skills, description } = req.body;
    if (!title || !company) {
      return res.status(400).json({ message: 'Title and company are required' });
    }

    const result = db
      .prepare('INSERT INTO jobs (title, company, location, type, skills, description, recruiter_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(title, company, location, type, skills, description, req.user.id);

    res.status(201).json({
      message: 'Job created successfully',
      jobId: result.lastInsertRowid
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /jobs/:id/apply - Candidate applies to a job (with resume & email notification)
router.post(
  '/:id/apply',
  verifyToken,
  requireRole('candidate'),
  upload.single('resume'),
  async (req, res) => {
    try {
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

      let match = { score: null, matched: [], missing: [] };
      try {
        const parser = new PDFParse({ data: fs.readFileSync(req.file.path) });
        const pdfData = await parser.getText();
        await parser.destroy();
        match = calculateMatch(pdfData.text, job.skills);
      } catch (err) {
        console.log('Could not read the PDF text:', err.message);
      }

      const result = db
        .prepare('INSERT INTO applications (job_id, candidate_id, resume_path, match_score) VALUES (?, ?, ?, ?)')
        .run(job.id, req.user.id, 'uploads/' + req.file.filename, match.score);

      // --- TRIGGER CANDIDATE CONFIRMATION EMAIL ---
      try {
        const candidate = db.prepare('SELECT name, email FROM users WHERE id = ?').get(req.user.id);
        if (candidate && candidate.email) {
          await sendMail({
            to: candidate.email,
            subject: `Application Received: ${job.title} at ${job.company}`,
            text: `Hello ${candidate.name},\n\nYour application for "${job.title}" has been successfully submitted.\nOur team will review your qualifications shortly.\n\nBest regards,\nRecruitment Team`
          });
          console.log('📧 Confirmation email successfully sent to:', candidate.email);
        }
      } catch (emailErr) {
        console.log('Email dispatch error:', emailErr.message);
      }

      res.status(201).json({
        message: 'Application submitted successfully',
        applicationId: result.lastInsertRowid,
        matchScore: match.score,
        matchedSkills: match.matched,
        missingSkills: match.missing
      });
    } catch (err) {
      if (req.file) fs.unlinkSync(req.file.path);
      res.status(500).json({ message: err.message });
    }
  }
);

// DELETE /jobs/:id - Recruiter deletes a job
router.delete('/:id', verifyToken, requireRole('recruiter'), (req, res) => {
  try {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ? AND recruiter_id = ?').get(req.params.id, req.user.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found or unauthorized' });
    }

    db.prepare('DELETE FROM jobs WHERE id = ?').run(req.params.id);
    res.json({ message: 'Job deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /jobs/:id/applicants (Recruiter only)
router.get('/:id/applicants', verifyToken, requireRole('recruiter'), (req, res) => {
  const jobId = req.params.id;

  // Verify the job belongs to this recruiter
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
  if (!job) {
    return res.status(404).json({ message: 'Job not found' });
  }
  if (job.recruiter_id !== req.user.id) {
    return res.status(403).json({ message: 'Access denied' });
  }

  // Fetch applications for this job with candidate details
  const applicants = db.prepare(
    'SELECT a.id AS application_id, a.status, a.match_score, a.resume_path, ' +
    'u.id AS candidate_id, u.name, u.email ' +
    'FROM applications a ' +
    'JOIN users u ON u.id = a.candidate_id ' +
    'WHERE a.job_id = ?'
  ).all(jobId);

  res.json(applicants);
});

module.exports = router;