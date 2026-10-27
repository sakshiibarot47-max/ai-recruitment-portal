const jwt = require('jsonwebtoken');

// Checks that the request has a valid token
function verifyToken(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = header.split(' ')[1];

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
      console.log('JWT error:', err.message);

    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Checks that the logged-in user has the right role
function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ message: 'Access denied for your role' });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };