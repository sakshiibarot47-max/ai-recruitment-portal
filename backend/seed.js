// Fills the database with demo data: 1 recruiter, 2 candidates, 6 jobs and a few applications.
// Safe to run many times: it never creates the same user or job twice.
// Run:  node seed.js
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { PDFParse } = require('pdf-parse');
const db = require('./database');
const { calculateMatch } = require('./utils/matcher');

const PASSWORD = 'Test@1234';

const USERS = [
  { name: 'Demo Recruiter', email: 'recruiter@hireai.test', role: 'recruiter' },
  { name: 'Demo Candidate One', email: 'candidate1@hireai.test', role: 'candidate' },
  { name: 'Demo Candidate Two', email: 'candidate2@hireai.test', role: 'candidate' },
];

const JOBS = [
  { title: 'React Developer Intern', company: 'Chitra Technologies', location: 'Surat', type: 'Internship', skills: 'React, JavaScript, HTML, CSS', description: 'Build user interfaces for the hiring portal.' },
  { title: 'Node.js Backend Developer', company: 'Chitra Technologies', location: 'Ahmedabad', type: 'Full-time', skills: 'Node.js, Express, SQL', description: 'Build and maintain REST APIs.' },
  { title: 'UI/UX Designer', company: 'Chitra Technologies', location: 'Remote', type: 'Part-time', skills: 'Figma, Design, Wireframing', description: 'Design clean screens for web applications.' },
  { title: 'Full Stack Intern', company: 'Chitra Technologies', location: 'Surat', type: 'Internship', skills: 'React, Node.js, SQL, CSS, Git', description: 'Work on both the frontend and the backend.' },
  { title: 'Python Data Intern', company: 'Chitra Technologies', location: 'Mumbai', type: 'Internship', skills: 'Python, Pandas, SQL', description: 'Clean and analyse hiring data.' },
  { title: 'QA Tester', company: 'Chitra Technologies', location: 'Surat', type: 'Full-time', skills: 'Postman, Testing, Selenium', description: 'Test web applications and report bugs.' },
];

// Which sample resume each candidate uses to apply to which job (by job title), and the status to set
const APPLICATIONS = [
  { candidate: 'candidate1@hireai.test', job: 'React Developer Intern', resume: '01_strong_react_developer.pdf', status: 'Shortlisted' },
  { candidate: 'candidate1@hireai.test', job: 'Full Stack Intern', resume: '01_strong_react_developer.pdf', status: 'Applied' },
  { candidate: 'candidate2@hireai.test', job: 'React Developer Intern', resume: '02_medium_frontend.pdf', status: 'Applied' },
  { candidate: 'candidate2@hireai.test', job: 'Node.js Backend Developer', resume: '03_backend_node.pdf', status: 'Applied' },
];

async function readPdfText(filePath) {
  const parser = new PDFParse({ data: fs.readFileSync(filePath) });
  const result = await parser.getText();
  await parser.destroy();
  return result.text || '';
}

async function main() {
  // 1. Users
  const userIds = {};
  for (const u of USERS) {
    let row = db.prepare('SELECT id FROM users WHERE email = ?').get(u.email);
    if (!row) {
      const info = db
        .prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)')
        .run(u.name, u.email, bcrypt.hashSync(PASSWORD, 10), u.role);
      row = { id: info.lastInsertRowid };
      console.log('Created user:', u.email);
    }
    userIds[u.email] = row.id;
  }

  // 2. Jobs (all posted by the demo recruiter)
  const recruiterId = userIds['recruiter@hireai.test'];
  const jobIds = {};
  for (const j of JOBS) {
    let row = db.prepare('SELECT id FROM jobs WHERE title = ? AND recruiter_id = ?').get(j.title, recruiterId);
    if (!row) {
      const info = db
        .prepare('INSERT INTO jobs (title, company, location, type, skills, description, recruiter_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(j.title, j.company, j.location, j.type, j.skills, j.description, recruiterId);
      row = { id: info.lastInsertRowid };
      console.log('Created job:', j.title);
    }
    jobIds[j.title] = row.id;
  }

  // 3. Applications (needs the sample resume PDFs in the folder sample-resumes, next to backend)
  // The folder with the sample resume PDFs can be next to backend/ or inside it
  const resumeDir = [
    path.join(__dirname, '..', 'sample-resumes'),
    path.join(__dirname, 'sample-resumes'),
  ].find((folder) => fs.existsSync(folder));
  const uploadDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

  if (!resumeDir) {
    console.log('Skipped applications: the folder sample-resumes was not found (put it next to the backend folder).');
  } else {
    for (const a of APPLICATIONS) {
      const candidateId = userIds[a.candidate];
      const jobId = jobIds[a.job];
      const exists = db.prepare('SELECT id FROM applications WHERE job_id = ? AND candidate_id = ?').get(jobId, candidateId);
      if (exists) continue;

      const source = path.join(resumeDir, a.resume);
      if (!fs.existsSync(source)) {
        console.log('Skipped one application: missing file', a.resume);
        continue;
      }

      // Copy the resume into uploads/ and calculate the keyword match score
      const savedName = Date.now() + '-' + a.resume;
      fs.copyFileSync(source, path.join(uploadDir, savedName));
      const text = await readPdfText(source);
      const job = JOBS.find((j) => j.title === a.job);
      const match = calculateMatch(text, job.skills);

      db.prepare('INSERT INTO applications (job_id, candidate_id, resume_path, status, match_score) VALUES (?, ?, ?, ?, ?)')
        .run(jobId, candidateId, 'uploads/' + savedName, a.status, match.score);
      console.log('Created application:', a.candidate, '->', a.job, '(score ' + match.score + ', ' + a.status + ')');
    }
  }

  console.log('\nDone. Demo logins (password for all: ' + PASSWORD + '):');
  USERS.forEach((u) => console.log('  ' + u.role.padEnd(10) + u.email));
}

main().catch((err) => {
  console.log('Seed failed:', err.message);
  process.exit(1);
});