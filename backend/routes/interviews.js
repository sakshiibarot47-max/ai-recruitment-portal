const { createNotification } = require('../middleware/notificationHelper');
const express = require('express');
const db = require('../database');
const { verifyToken, requireRole } = require('../middleware/auth');
const { sendMail } = require('../utils/mailer');

const router = express.Router();

const MODES = ['Online', 'In-person'];
// Time format used everywhere: 2026-11-05 14:30  (year-month-day hour:minute, 24 hour clock)
const TIME_FORMAT = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

// POST /interviews  (recruiter only)
// Body: { applicationId, scheduledAt, mode, location, notes }
router.post('/', verifyToken, requireRole('recruiter'), (req, res) => {
  const { applicationId, scheduledAt, mode, location, notes } = req.body || {};

  if (!applicationId || !scheduledAt) {
    return res.status(400).json({ message: 'applicationId and scheduledAt are required' });
  }
  if (!TIME_FORMAT.test(scheduledAt)) {
    return res.status(400).json({ message: 'scheduledAt must look like 2026-11-05 14:30' });
  }
  const when = new Date(scheduledAt.replace(' ', 'T'));
  if (isNaN(when.getTime())) {
    return res.status(400).json({ message: 'scheduledAt is not a valid date' });
  }
  if (when.getTime() <= Date.now()) {
    return res.status(400).json({ message: 'Interview time must be in the future' });
  }

  const interviewMode = mode || 'Online';
  if (!MODES.includes(interviewMode)) {
    return res.status(400).json({ message: 'mode must be Online or In-person' });
  }

  // The application must exist and belong to one of this recruiter's jobs
  const application = db
    .prepare(
      'SELECT a.id, a.candidate_id, j.recruiter_id, j.title, j.company, u.name, u.email ' +
      'FROM applications a JOIN jobs j ON j.id = a.job_id JOIN users u ON u.id = a.candidate_id ' +
      'WHERE a.id = ?'
    )
    .get(applicationId);

  if (!application) {
    return res.status(404).json({ message: 'Application not found' });
  }
  if (application.recruiter_id !== req.user.id) {
    return res.status(403).json({ message: 'This application is not for your job' });
  }

  // Only one interview per application
  const already = db.prepare('SELECT id FROM interviews WHERE application_id = ?').get(applicationId);
  if (already) {
    return res.status(409).json({ message: 'An interview is already scheduled for this application' });
  }

  // Clash check: the recruiter cannot have two interviews at the same time
  const clash = db
    .prepare(
      'SELECT i.id FROM interviews i ' +
      'JOIN applications a ON a.id = i.application_id ' +
      'JOIN jobs j ON j.id = a.job_id ' +
      'WHERE j.recruiter_id = ? AND i.scheduled_at = ?'
    )
    .get(req.user.id, scheduledAt);
  if (clash) {
    return res.status(409).json({ message: 'You already have an interview at this time' });
  }

  const result = db
    .prepare('INSERT INTO interviews (application_id, scheduled_at, mode, location, notes) VALUES (?, ?, ?, ?, ?)')
    .run(applicationId, scheduledAt, interviewMode, location || null, notes || null);

  // Move the application to the Interview stage
  db.prepare('UPDATE applications SET status = ? WHERE id = ?').run('Interview', applicationId);

  // Trigger in-app notification for the candidate
  try {
    createNotification(
      application.candidate_id,
      `An interview has been scheduled for your application to "${application.title}" at ${application.company || 'Company'} on ${scheduledAt}.`,
      'INTERVIEW'
    );
  } catch (notifErr) {
    console.log('Notification could not be created:', notifErr.message);
  }

  // Email the candidate the interview details
  sendMail({
    to: application.email,
    subject: 'Interview scheduled: ' + application.title + ' at ' + application.company,
    text:
      'Hello ' + application.name + ',\n\n' +
      'Your interview for ' + application.title + ' at ' + application.company + ' is scheduled.\n\n' +
      'Date and time: ' + scheduledAt + '\n' +
      'Mode: ' + interviewMode + '\n' +
      (location ? 'Link or address: ' + location + '\n' : '') +
      (notes ? 'Notes: ' + notes + '\n' : '') +
      '\nGood luck!\nHireAI Recruitment',
  });

  res.status(201).json({ message: 'Interview scheduled', interviewId: result.lastInsertRowid });
});

// PUT /interviews/:id  (recruiter only: change the time, mode, link/address or notes)
// Body: { scheduledAt, mode, location, notes }  (send only what changed)
// The candidate gets an in-app notification and an email when something changed.
router.put('/:id', verifyToken, requireRole('recruiter'), (req, res) => {
  const interview = db
    .prepare(
      'SELECT i.id, i.application_id, i.scheduled_at, i.mode, i.location, i.notes, ' +
      'j.recruiter_id, j.title, j.company, a.candidate_id, u.name, u.email ' +
      'FROM interviews i ' +
      'JOIN applications a ON a.id = i.application_id ' +
      'JOIN jobs j ON j.id = a.job_id ' +
      'JOIN users u ON u.id = a.candidate_id ' +
      'WHERE i.id = ?'
    )
    .get(req.params.id);

  if (!interview) {
    return res.status(404).json({ message: 'Interview not found' });
  }
  if (interview.recruiter_id !== req.user.id) {
    return res.status(403).json({ message: 'This interview is not for your job' });
  }

  const body = req.body || {};
  const scheduledAt = body.scheduledAt !== undefined ? String(body.scheduledAt) : interview.scheduled_at;
  const mode = body.mode !== undefined ? body.mode : interview.mode;
  const location = body.location !== undefined ? String(body.location).trim() || null : interview.location;
  const notes = body.notes !== undefined ? String(body.notes).trim() || null : interview.notes;

  const timeChanged = scheduledAt !== interview.scheduled_at;

  if (timeChanged) {
    if (!TIME_FORMAT.test(scheduledAt)) {
      return res.status(400).json({ message: 'scheduledAt must look like 2026-11-05 14:30' });
    }
    const when = new Date(scheduledAt.replace(' ', 'T'));
    if (isNaN(when.getTime())) {
      return res.status(400).json({ message: 'scheduledAt is not a valid date' });
    }
    if (when.getTime() <= Date.now()) {
      return res.status(400).json({ message: 'Interview time must be in the future' });
    }
  }
  if (!MODES.includes(mode)) {
    return res.status(400).json({ message: 'mode must be Online or In-person' });
  }

  const modeChanged = mode !== interview.mode;
  const locationChanged = (location || null) !== (interview.location || null);
  const notesChanged = (notes || null) !== (interview.notes || null);

  if (!timeChanged && !modeChanged && !locationChanged && !notesChanged) {
    return res.json({ message: 'No changes to save' });
  }

  // Clash check (ignore this interview itself)
  if (timeChanged) {
    const clash = db
      .prepare(
        'SELECT i.id FROM interviews i ' +
        'JOIN applications a ON a.id = i.application_id ' +
        'JOIN jobs j ON j.id = a.job_id ' +
        'WHERE j.recruiter_id = ? AND i.scheduled_at = ? AND i.id != ?'
      )
      .get(req.user.id, scheduledAt, interview.id);
    if (clash) {
      return res.status(409).json({ message: 'You already have an interview at this time' });
    }
  }

  db.prepare('UPDATE interviews SET scheduled_at = ?, mode = ?, location = ?, notes = ? WHERE id = ?')
    .run(scheduledAt, mode, location, notes, interview.id);

  // In-app notification for the candidate
  try {
    createNotification(
      interview.candidate_id,
      timeChanged
        ? `Your interview for "${interview.title}" at ${interview.company || 'Company'} has been rescheduled to ${scheduledAt}.`
        : `The details of your interview for "${interview.title}" at ${interview.company || 'Company'} (${scheduledAt}) were updated.`,
      'INTERVIEW'
    );
  } catch (notifErr) {
    console.log('Notification could not be created:', notifErr.message);
  }

  // Email the candidate the new details
  sendMail({
    to: interview.email,
    subject: (timeChanged ? 'Interview rescheduled: ' : 'Interview updated: ') + interview.title + ' at ' + interview.company,
    text:
      'Hello ' + interview.name + ',\n\n' +
      'Your interview for ' + interview.title + ' at ' + interview.company + ' was ' + (timeChanged ? 'rescheduled' : 'updated') + '.\n\n' +
      'Date and time: ' + scheduledAt + '\n' +
      'Mode: ' + mode + '\n' +
      (location ? 'Link or address: ' + location + '\n' : '') +
      (notes ? 'Notes: ' + notes + '\n' : '') +
      '\nGood luck!\nHireAI Recruitment',
  });

  res.json({ message: 'Interview updated' });
});

// GET /interviews  (recruiter only: all interviews for their jobs, earliest first)
router.get('/', verifyToken, requireRole('recruiter'), (req, res) => {
  const rows = db
    .prepare(
      'SELECT i.id, i.application_id, i.scheduled_at, i.mode, i.location, i.notes, ' +
      'u.name AS candidate_name, u.email AS candidate_email, j.title AS job_title ' +
      'FROM interviews i ' +
      'JOIN applications a ON a.id = i.application_id ' +
      'JOIN jobs j ON j.id = a.job_id ' +
      'JOIN users u ON u.id = a.candidate_id ' +
      'WHERE j.recruiter_id = ? ORDER BY i.scheduled_at ASC'
    )
    .all(req.user.id);
  res.json(rows);
});

// GET /interviews/my  (candidate only: their own interviews)
router.get('/my', verifyToken, requireRole('candidate'), (req, res) => {
  const rows = db
    .prepare(
      'SELECT i.id, i.application_id, i.scheduled_at, i.mode, i.location, i.notes, ' +
      'j.title AS job_title, j.company ' +
      'FROM interviews i ' +
      'JOIN applications a ON a.id = i.application_id ' +
      'JOIN jobs j ON j.id = a.job_id ' +
      'WHERE a.candidate_id = ? ORDER BY i.scheduled_at ASC'
    )
    .all(req.user.id);
  res.json(rows);
});

module.exports = router;