const express = require('express');
const multer = require('multer');
const { PDFParse } = require('pdf-parse');
const { verifyToken, requireRole } = require('../middleware/auth');
const { extractProfile } = require('../utils/profileAi');

const router = express.Router();

// The PDF is only read and thrown away: it is kept in memory and never saved to disk
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

// POST /profile/import-resume  (candidate only, form-data, field name: resume)
// It does NOT change the profile. It returns suggestions; the candidate checks them
// and saves them with PUT /profile/me.
router.post('/import-resume', verifyToken, requireRole('candidate'), upload.single('resume'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Please upload a PDF resume' });
  }

  let text = '';
  try {
    const parser = new PDFParse({ data: req.file.buffer });
    const pdfData = await parser.getText();
    await parser.destroy();
    // Remove the page markers (such as "-- 1 of 2 --") that the PDF reader adds
    text = (pdfData.text || '').replace(/^--\s*\d+\s+of\s+\d+\s*--$/gm, '').trim();
  } catch (err) {
    console.log('Could not read the PDF text:', err.message);
    return res.status(422).json({ message: 'This PDF could not be read' });
  }

  if (text.length === 0) {
    return res
      .status(422)
      .json({ message: 'No text found in this PDF. It may be a scanned image.' });
  }

  const result = await extractProfile(text);
  res.json({
    message: 'Check these suggestions, then save them with PUT /profile/me',
    method: result.method,
    suggestions: result.suggestions,
  });
});

// Clear message for upload errors (wrong file type, too big)
router.use((err, req, res, next) => {
  res.status(400).json({ message: err.message });
});

module.exports = router;