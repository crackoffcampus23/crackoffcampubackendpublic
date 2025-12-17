function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: admin only' });
  }
  next();
}

function requireUser(req, res, next) {
  if (!req.user || (req.user.role && req.user.role !== 'user')) {
    // If role present, must be 'user'; if no role present, treat as non-user
    return res.status(403).json({ error: 'Forbidden: user only' });
  }
  next();
}

module.exports = { requireAdmin, requireUser };
