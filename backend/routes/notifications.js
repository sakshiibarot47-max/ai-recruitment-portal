const express = require('express');
const db = require('../database');
const { verifyToken } = require('../middleware/auth');
require('../utils/notify'); // makes sure the notifications table exists

const router = express.Router();

// 1. GET /notifications (latest 50, newest first)
router.get('/', verifyToken, (req, res) => {
  let sql = 'SELECT id, type, message, is_read, created_at FROM notifications WHERE user_id = ?';
  if (req.query.unread === 'true') sql += ' AND is_read = 0';
  sql += ' ORDER BY id DESC LIMIT 50';

  const notifications = db.prepare(sql).all(req.user.id);
  const unreadCount = db
    .prepare('SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND is_read = 0')
    .get(req.user.id).total;

  res.json({ unreadCount, notifications });
});

// 2. GET /notifications/unread (TC_37)
router.get('/unread', verifyToken, (req, res) => {
  const notifications = db
    .prepare('SELECT id, type, message, is_read, created_at FROM notifications WHERE user_id = ? AND is_read = 0 ORDER BY id DESC LIMIT 50')
    .all(req.user.id);
  
  const unreadCount = notifications.length;

  res.json({ unreadCount, notifications });
});

// 3. PUT /notifications/read-all (mark all as read)
router.put('/read-all', verifyToken, (req, res) => {
  const result = db
    .prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0')
    .run(req.user.id);
  res.json({ message: 'All notifications marked as read', updated: result.changes });
});

// 4. PUT /notifications/:id/read (mark one as read)
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