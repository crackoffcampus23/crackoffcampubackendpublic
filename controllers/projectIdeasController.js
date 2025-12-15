const model = require('../models/projectIdeasModel');

function sanitize(row) {
  if (!row) return null;
  return {
    projectId: row.project_id,
    projectName: row.project_name,
    projectLaunchAuthority: row.project_launch_authority,
    rating: row.rating !== null ? Number(row.rating) : null,
    totalReviews: row.total_reviews,
    downloadURL: row.download_url,
    bannerImageUrl: row.banner_image_url,
    published: row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function add(req, res) {
  try {
    const created = await model.create(req.body || {});
    return res.status(201).json({ item: sanitize(created) });
  } catch (e) {
    console.error('projectIdeas.add error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getAll(req, res) {
  try {
    const rows = await model.listAll();
    return res.json({ items: rows.map(sanitize) });
  } catch (e) {
    console.error('projectIdeas.getAll error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getPublic(req, res) {
  try {
    const rows = await model.listPublic();
    return res.json({ items: rows.map(sanitize) });
  } catch (e) {
    console.error('projectIdeas.getPublic error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteOne(req, res) {
  try {
    const { projectid } = req.params;
    if (!projectid) return res.status(400).json({ error: 'projectid param is required' });
    const ok = await model.deleteById(projectid);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    return res.json({ success: true });
  } catch (e) {
    console.error('projectIdeas.deleteOne error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function edit(req, res) {
  try {
    const { projectid } = req.params;
    if (!projectid) return res.status(400).json({ error: 'projectid param is required' });
    const patch = req.body || {};
    const updated = await model.updateById(projectid, patch);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    return res.json({ item: sanitize(updated) });
  } catch (e) {
    console.error('projectIdeas.edit error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { add, getAll, getPublic, deleteOne, edit };