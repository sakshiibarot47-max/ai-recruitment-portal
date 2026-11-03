const db = require('../database');

// This table is created here, so database.js does not need to change
db.exec(`
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`);

// Saves one notification for one user.
// type: a short word such as "status", "interview" or "application"
// It never stops the main work: if saving fails, it only prints the reason.
function createNotification(userId, type, message, link) {
  try {
    db.prepare('INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)').run(
      userId,
      type,
      message,
      link || null
    );
  } catch (err) {
    console.log('Notification could not be saved:', err.message);
  }
}

module.exports = { createNotification };