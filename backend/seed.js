const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

// Connect to recruitment.db
const dbPath = path.join(__dirname, 'recruitment.db');
const db = new Database(dbPath);

console.log('🌱 Starting database seeding...');

// Temporarily disable foreign keys to safely clear existing data
db.exec('PRAGMA foreign_keys = OFF;');
db.exec(`
  DELETE FROM notifications;
  DELETE FROM applications;
  DELETE FROM jobs;
  DELETE FROM users;
`);
db.exec('PRAGMA foreign_keys = ON;');

const hashedPassword = bcrypt.hashSync('password123', 10);

// 1. Insert Users (Recruiters & Candidates)
const insertUser = db.prepare(`
  INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)
`);

const recruiterId = insertUser.run('Demo Recruiter', 'recruiter@demo.com', hashedPassword, 'recruiter').lastInsertRowid;
const candidateId = insertUser.run('Sakshi Barot', 'sakshi@demo.com', hashedPassword, 'candidate').lastInsertRowid;

console.log('✅ Users seeded successfully.');

// 2. Insert Sample Jobs (Matching exact table columns)
const insertJob = db.prepare(`
  INSERT INTO jobs (recruiter_id, title, description, location) 
  VALUES (?, ?, ?, ?)
`);

const jobId = insertJob.run(
  recruiterId, 
  'Full Stack Developer', 
  'Looking for a passionate Node.js and React developer. Requirements: Node.js, Express, SQLite, JavaScript', 
  'Surat, Gujarat'
).lastInsertRowid;

console.log('✅ Sample jobs seeded successfully.');

// 3. Insert Sample Application
const insertApp = db.prepare(`
  INSERT INTO applications (job_id, candidate_id, status) 
  VALUES (?, ?, ?)
`);

insertApp.run(jobId, candidateId, 'Shortlisted');

console.log('✅ Sample applications seeded successfully.');
console.log('🎉 Database seeding completed successfully!');