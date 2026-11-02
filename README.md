# ai-recruitment-portal
AI-powered recruitment and hiring portal: job seekers apply with a PDF resume, recruiters see candidates ranked by match score. Built with React, Node.js/Express and SQLite.
### **Candidate Saved Jobs & Applications Endpoints **
- **`GET /saved-jobs`** - Get all saved jobs for the logged-in candidate (Newest first)
- **`POST /saved-jobs/:jobId`** - Save/bookmark a job
- **`DELETE /saved-jobs/:jobId`** - Remove a job from saved list
- **`DELETE /my/applications/:id`** - Withdraw an unreviewed job application (Status must be "Applied")