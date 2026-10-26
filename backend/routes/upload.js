const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Make sure the uploads folder exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Where and how to save the file
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
});

// Only allow PDF files
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') cb(null, true);
  else cb(new Error('Only PDF files are allowed'));
};

// Max size 5 MB
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

const router = express.Router();

// POST /upload/test  (form-data, key: resume, type: File)
router.post('/test', upload.single('resume'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Please upload a PDF file' });
  }
  res.status(201).json({
    message: 'File uploaded',
    filename: req.file.filename
  });
});

// Show a clear message for upload errors (wrong type, too big)
router.use((err, req, res, next) => {
  res.status(400).json({ message: err.message });
});

module.exports = router;
