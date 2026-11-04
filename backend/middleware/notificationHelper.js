const db = require('../database');

function createNotification(userId, message, type) {
  try {
    db.prepare(`
      INSERT INTO notifications (user_id, message, type)
      VALUES (?, ?, ?)
    `).run(userId, message, type);
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
}

module.exports = { createNotification };