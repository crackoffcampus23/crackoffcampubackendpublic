const { getByUserId, updateByUserId, listAll, setPlanType, setUserType } = require('../models/userDetailsModel');

function sanitize(details) {
  if (!details) return null;
  return {
    userId: details.user_id,
    userType: details.user_type,
    planType: details.plan_type,
    userProfileBg: details.user_profile_bg,
    userPfp: details.user_pfp,
    userDescription: details.user_description,
    skillAndExpertise: details.skill_and_expertise,
    experience: details.experience,
    education: details.education,
    createdAt: details.created_at,
    updatedAt: details.updated_at
  };
}

async function getUserDetails(req, res) {
  try {
    const isAdmin = req.user && req.user.role === 'admin';
    const queryUserId = req.query.userId;

    if (isAdmin) {
      // Admin behavior: list all when no userId provided, else fetch specific
      if (!queryUserId) {
        const rows = await listAll();
        return res.json({ items: rows.map(sanitize) });
      }
      const details = await getByUserId(queryUserId);
      if (!details) return res.status(404).json({ error: 'User details not found' });
      return res.json({ details: sanitize(details) });
    }

    // Normal user behavior: must provide their own userId in query; list-all is forbidden
    if (!queryUserId) {
      return res.status(403).json({ error: 'Forbidden: provide your userId to access your details' });
    }
    const selfId = req.user && req.user.sub;
    if (!selfId) return res.status(401).json({ error: 'Unauthorized' });
    if (queryUserId !== selfId) {
      return res.status(403).json({ error: 'Forbidden: cannot access other users\' details' });
    }
    const details = await getByUserId(selfId);
    if (!details) return res.status(404).json({ error: 'User details not found' });
    return res.json({ details: sanitize(details) });
  } catch (e) {
    console.error('getUserDetails error', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function editUserDetails(req, res) {
  try {
    const { userid } = req.params;
    if (!userid) return res.status(400).json({ error: 'userid param required' });
    const isAdmin = req.user && req.user.role === 'admin';
    const selfId = req.user && req.user.sub;
    if (!isAdmin && selfId !== userid) {
      return res.status(403).json({ error: 'Forbidden: can only edit your own details' });
    }
    // Block attempts to change immutable fields for non-admins; allow admin to update userType
    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'userType') && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden: userType can only be updated by admin' });
    }
    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'userId')) {
      return res.status(400).json({ error: 'userId is immutable and cannot be updated' });
    }
    // Admin-specific updates for planType and userType
    let updated;
    const payload = req.body || {};
    if (isAdmin && payload.planType) {
      updated = await setPlanType(userid, payload.planType);
    } else if (isAdmin && payload.userType) {
      updated = await setUserType(userid, payload.userType);
    } else {
      updated = await updateByUserId(userid, payload);
    }
    res.json({ details: sanitize(updated) });
  } catch (e) {
    console.error('editUserDetails error', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getUserDetails, editUserDetails };
