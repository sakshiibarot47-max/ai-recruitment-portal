const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Stop at once if the secret for the login token is missing
if (!process.env.JWT_SECRET) {
  console.log('JWT_SECRET is missing. Add it to the .env file, then start the server again.');
  process.exit(1);
}

const app = express();

// Security and Error Handling Middleware
const { securityHeaders, authLimiter, notFound, errorHandler } = require('./middleware/security');

app.use(securityHeaders);
app.use(cors({ exposedHeaders: ['X-Total-Count', 'X-Total-Pages'] }));
app.use(express.json({ limit: '100kb' }));

// Auth & Jobs & Applications Routes (Apply rate limits to auth login and register)
const authRoutes = require('./routes/auth');
app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);
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

// Recruiter Dashboard Routes
const recruiterRoutes = require('./routes/recruiter');
app.use('/recruiter', recruiterRoutes);
const candidateStatsRoutes = require('./routes/candidateStats');
app.use('/candidate', candidateStatsRoutes);

// Health Check Routes
app.get('/', (req, res) => res.send('Backend is running'));
app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'Recruitment API is alive' }));

// 404 and Error Handler Middleware (Must be right before app.listen)
app.use(notFound);
app.use(errorHandler);

// Start Server (Must be at the very bottom)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));