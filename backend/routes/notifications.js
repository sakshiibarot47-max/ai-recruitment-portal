const express = require('express');
const db = require('../database');
const { verifyToken } = require('../middleware/auth');
require('../utils/notify'); // makes sure the notifications table exists

const router = express.Router();

// Every route here works for any logged-in user (candidate or recruiter).
// A user can only see and change their own notifications.

// GET /notifications  (latest 50, newest first). Add ?unread=true to get only unread ones.
router.get('/', verifyToken, (req, res) => {
  let sql = 'SELECT id, type, message, link, is_read, created_at FROM notifications WHERE user_id = ?';
  if (req.query.unread === 'true') sql += ' AND is_read = 0';
  sql += ' ORDER BY id DESC LIMIT 50';

  const notifications = db.prepare(sql).all(req.user.id);
  const unreadCount = db
    .prepare('SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND is_read = 0')
    .get(req.user.id).total;

  res.json({ unreadCount, notifications });
});

// PUT /notifications/read-all  (mark all of my notifications as read)
router.put('/read-all', verifyToken, (req, res) => {
  const result = db
    .prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0')
    .run(req.user.id);
  res.json({ message: 'All notifications marked as read', updated: result.changes });
});

// PUT /notifications/:id/read  (mark one notification as read)
router.put('/:id/read', verifyToken, (req, res) => {
  const result = db
    .prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);

  if (result.changes === 0) {
    return res.status(404).json({ message: 'Notification not found' });
  }
  res.json({ message: 'Notification marked as read' });
});

module.exports = router;