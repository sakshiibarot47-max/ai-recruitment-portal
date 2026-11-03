const { createNotification } = require('./utils/notify');

// Apne database ke mutabiq ID badal sakti ho (maslan Candidate ID = 3, Recruiter ID = 2)
createNotification(3, 'status', 'Your application for React Intern is now Shortlisted', '/my-applications');
createNotification(3, 'interview', 'Interview scheduled: 2026-11-05 14:30', '/my-interviews');
createNotification(3, 'application', 'Welcome message', null);
createNotification(2, 'application', 'New application for React Intern from Test Candidate', '/recruiter/jobs/1/applicants');

console.log('Test notifications saved');