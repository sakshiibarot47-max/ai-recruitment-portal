const Database = require('better-sqlite3');
const db = new Database('recruitment.db');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('candidate','recruiter'))
);

CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  company TEXT,
  location TEXT,
  type TEXT,
  skills TEXT,
  description TEXT,
  recruiter_id INTEGER,
  FOREIGN KEY (recruiter_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER,
  candidate_id INTEGER,
  resume_path TEXT,
  status TEXT DEFAULT 'Applied',
  match_score INTEGER,
  applied_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id),
  FOREIGN KEY (candidate_id) REFERENCES users(id)
);
`);

console.log('Database ready: 3 tables created');
module.exports = db;