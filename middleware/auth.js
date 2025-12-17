const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  const header = req.headers['authorization'] || req.headers['Authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = header.slice('Bearer '.length);
  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(500).json({ error: 'Server misconfigured' });
  try {
    const payload = jwt.verify(token, secret);
    req.user = payload; // { sub, email, name, iat, exp }
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = auth;
