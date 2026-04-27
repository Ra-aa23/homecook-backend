const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'homecook_secret_2026';

// Verify token middleware
const auth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const token = header.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Role-based access
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: `Access denied. Required: ${roles.join(' or ')}` });
  }
  next();
};

// ✅ FIX: nedb uses _id, not id
const generateToken = (user) =>
  jwt.sign(
    {
      id:    user._id || user.id,   // nedb uses _id
      email: user.email,
      role:  user.role,
      name:  user.name,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

module.exports = { auth, requireRole, generateToken };