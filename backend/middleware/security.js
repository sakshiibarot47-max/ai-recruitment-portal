const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Security headers on every reply. "cross-origin" lets the React frontend (another port) read our replies.
const securityHeaders = helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } });

// Limits how many times one computer can try to log in or register (stops password guessing).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again after 15 minutes.' },
});

// For any link that does not exist
function notFound(req, res) {
  res.status(404).json({ message: 'Route not found: ' + req.method + ' ' + req.originalUrl });
}

// Catches every error, so the server always answers with JSON and never shows technical details
function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'The request body is not valid JSON' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'The request body is too large' });
  }

  console.log('Server error:', err.message);
  res.status(500).json({ message: 'Something went wrong on the server' });
}

module.exports = { securityHeaders, authLimiter, notFound, errorHandler };