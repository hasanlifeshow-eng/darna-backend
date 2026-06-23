// middleware/auth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-env-file';

// يتحقق من رمز الدخول في طلبات REST العادية
function requireAuth(req, res, next) {
  const header = req.headers['authorization'];
  const token = header && header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'لازم تسجل دخول الأول' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, username, displayName }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'جلسة الدخول منتهية، سجّل دخول تاني' });
  }
}

// نفس الفكرة لكن لاتصالات Socket.io
function verifySocketToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, displayName: user.displayName },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

module.exports = { requireAuth, verifySocketToken, signToken, JWT_SECRET };
