const { add, remove, getByUserId } = require('../models/savedJobsModel');

function sanitize(row) {
  if (!row) return null;
  return {
    userId: row.user_id,
    jobIds: Array.isArray(row.job_ids) ? row.job_ids : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function saveJob(req, res) {
  try {
    const body = req.body || {};
    const userId = String(body.userId || '').trim();
    const jobId = String(body.jobId || '').trim();
    if (!userId || !jobId) return res.status(400).json({ error: 'userId and jobId are required' });

    const isAdmin = req.user && req.user.role === 'admin';
    const selfId = req.user && req.user.sub;
    if (!isAdmin && selfId !== userId) {
      return res.status(403).json({ error: 'Forbidden: can only save jobs for your own account' });
    }

    const row = await add(userId, jobId);
    return res.status(201).json({ item: sanitize(row) });
  } catch (e) {
    console.error('saveJob error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getSavedJobs(req, res) {
  try {
    const userId = (req.params && req.params.userid) ? String(req.params.userid) : '';
    if (!userId) return res.status(400).json({ error: 'userid param required' });

    const isAdmin = req.user && req.user.role === 'admin';
    const selfId = req.user && req.user.sub;
    if (!isAdmin && selfId !== userId) {
      return res.status(403).json({ error: 'Forbidden: cannot access other users\' saved jobs' });
    }

    const row = await getByUserId(userId);
    const item = sanitize(row) || { userId, jobIds: [] };
    return res.json({ items: item.jobIds });
  } catch (e) {
    console.error('getSavedJobs error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function removeSavedJob(req, res) {
  try {
    const body = req.body || {};
    const userId = String(body.userId || '').trim();
    const jobId = String(body.jobId || '').trim();
    if (!userId || !jobId) return res.status(400).json({ error: 'userId and jobId are required' });

    const isAdmin = req.user && req.user.role === 'admin';
    const selfId = req.user && req.user.sub;
    if (!isAdmin && selfId !== userId) {
      return res.status(403).json({ error: 'Forbidden: can only remove jobs from your own account' });
    }

    const row = await remove(userId, jobId);
    return res.json({ item: sanitize(row) });
  } catch (e) {
    console.error('removeSavedJob error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { saveJob, getSavedJobs, removeSavedJob };
