const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database');
const { verifyToken, requireRole } = require('../middleware/auth');
const { PDFParse } = require('pdf-parse');
const { calculateMatch } = require('../utils/matcher');
const { analyzeResume } = require('../utils/ai');
const sendMail = require('../utils/mailer');

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

// POST /jobs/:id/apply
router.post(
  '/jobs/:id/apply',
  verifyToken,
  requireRole('candidate'),
  upload.single('resume'),
  async (req, res) => {
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

    let match = { score: null, matched: [], missing: [], summary: null, method: 'keyword' };
    try {
      const parser = new PDFParse({ data: fs.readFileSync(req.file.path) });
      const pdfData = await parser.getText();
      await parser.destroy();
      match = await analyzeResume(pdfData.text, job);
    } catch (err) {
      console.log('Could not read the PDF text:', err.message);
    }

    const result = db
      .prepare('INSERT INTO applications (job_id, candidate_id, resume_path, match_score, ai_summary) VALUES (?, ?, ?, ?, ?)')
      .run(job.id, req.user.id, 'uploads/' + req.file.filename, match.score, match.summary || null);

    // --- TRIGGER CANDIDATE CONFIRMATION EMAIL ---
    try {
      const candidate = db.prepare('SELECT name, email FROM users WHERE id = ?').get(req.user.id);
      console.log('-> Candidate found for email:', candidate);

      if (candidate && candidate.email) {
        console.log('-> Triggering sendMail function...');
        await sendMail({
          to: candidate.email,
          subject: `Application Received: ${job.title} at ${job.company}`,
          text: `Hello ${candidate.name},\n\nYour application for "${job.title}" has been successfully submitted.\nOur team will review your qualifications shortly.\n\nBest regards,\nRecruitment Team`
        });
      } else {
        console.log('-> Warning: Candidate email not found in database!');
      }
    } catch (emailErr) {
      console.log('❌ Email dispatch error caught:', emailErr.message);
    }
console.log('Final match object before sending:', match);
    res.status(201).json({
      message: 'Application submitted and confirmation email sent!',
      applicationId: result.lastInsertRowid,
      matchScore: match.score,
      matchedSkills: match.matched,
      missingSkills: match.missing,
      matchMethod: match.method || null,
      aiSummary: match.summary || null
    });
  }
);

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

router.use((err, req, res, next) => {
  res.status(400).json({ message: err.message });
});

module.exports = router;