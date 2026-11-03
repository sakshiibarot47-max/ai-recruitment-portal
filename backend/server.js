const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Auth & Jobs & Applications Routes
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

const jobRoutes = require('./routes/jobs');
app.use('/jobs', jobRoutes);

const applicationRoutes = require('./routes/applications');
app.use('/applications', applicationRoutes);

// New Weekend Task Routes (Profile & Recommendations)
const profileRoutes = require('./routes/profile');
app.use('/profile', profileRoutes);

const recommendationsRoutes = require('./routes/recommendations');
app.use('/recommendations', recommendationsRoutes);

// Apply & Upload Routes
const applyRoutes = require('./routes/apply');
app.use('/', applyRoutes);

const uploadRoutes = require('./routes/upload');
app.use('/upload', uploadRoutes);

// Recruiter Routes
const recruiterRoutes = require('./routes/recruiter');
app.use('/recruiter', recruiterRoutes);

// Day 6 Task Routes (Saved Jobs & Withdraw Application)
const savedRoutes = require('./routes/saved');
app.use('/saved-jobs', savedRoutes);

const withdrawRoutes = require('./routes/withdraw');
app.use('/my', withdrawRoutes);

// Day 7 Task Routes (Notifications API)
const notificationRoutes = require('./routes/notifications');
app.use('/notifications', notificationRoutes);

// Health Check Routes
app.get('/', (req, res) => res.send('Backend is running'));
app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'Recruitment API is alive' }));

// Start Server (Must be at the very bottom)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));