// Login ke naye system (phone + OTP) ke liye database badlav.
// Safe hai: baar baar chalane par kuch nahi bigadta, purane users aur unka data bacha rehta hai.
module.exports = function migrateAuth(db) {
  const columns = db.prepare('PRAGMA table_info(users)').all();
  const hasPhone = columns.some((c) => c.name === 'phone');

  if (!hasPhone) {
    // Purani table me email "NOT NULL" tha. Phone se bane account ka email nahi hota,
    // isliye table ko naye shape me dobara banate hain (SQLite me aur koi tarika nahi).
    db.pragma('foreign_keys = OFF');
    try {
      db.transaction(() => {
        db.exec(`
          CREATE TABLE users_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE,
            phone TEXT UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('candidate','recruiter')),
            company_name TEXT,
            is_verified INTEGER NOT NULL DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          );
          INSERT INTO users_new (id, name, email, password, role)
            SELECT id, name, email, password, role FROM users;
          DROP TABLE users;
          ALTER TABLE users_new RENAME TO users;
        `);
      })();
    } finally {
      db.pragma('foreign_keys = ON');
    }
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS otp_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      purpose TEXT NOT NULL CHECK (purpose IN ('register','reset')),
      channel TEXT NOT NULL CHECK (channel IN ('sms','email')),
      code_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      used INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_otp_user_purpose ON otp_codes (user_id, purpose);
  `);
};
