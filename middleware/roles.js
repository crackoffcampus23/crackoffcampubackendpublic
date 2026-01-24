function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: admin only' });
  }
  next();
}

// For CMS: allow both full admins and interns to manage jobs
function requireAdminOrIntern(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'intern')) {
    return res.status(403).json({ error: 'Forbidden: admin or intern only' });
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

// Allow either an admin or the same user as the route param
function requireAdminOrSelf(paramKey) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const targetId = req.params[paramKey];
    if (!targetId) {
      return res.status(400).json({ error: `${paramKey} param required` });
    }

    const isAdmin = req.user.role === 'admin';
    const isSelf = req.user.sub === targetId;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: 'Forbidden: can only act on own user' });
    }

    next();
  };
}

module.exports = { requireAdmin, requireUser, requireAdminOrSelf, requireAdminOrIntern };
