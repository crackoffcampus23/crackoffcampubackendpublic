const model = require('../models/testimonialsModel');

function sanitize(row) {
  if (!row) return null;
  return {
    videoStoryId: row.video_story_id,
    studentName: row.student_name,
    studentRole: row.student_role,
    salary: row.salary,
    company: row.company,
    companyLogo: row.company_logo,
    imageUrl: row.image_url,
    videoUrl: row.video_url,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Minimal fields for list view as requested
function sanitizeLite(row) {
  if (!row) return null;
  return {
    videoStoryId: row.video_story_id,
    imageUrl: row.image_url,
    videoUrl: row.video_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function add(req, res) {
  try {
    const created = await model.create(req.body || {});
    return res.status(201).json({ item: sanitize(created) });
  } catch (e) {
    console.error('testimonials.add error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getAll(req, res) {
  try {
    const rows = await model.listAll();
    return res.json({ items: rows.map(sanitizeLite) });
  } catch (e) {
    console.error('testimonials.getAll error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteOne(req, res) {
  try {
    const { videostoryid } = req.params;
    if (!videostoryid) return res.status(400).json({ error: 'videostoryid param is required' });
    const ok = await model.deleteByVideoStoryId(videostoryid);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    return res.json({ success: true });
  } catch (e) {
    console.error('testimonials.deleteOne error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function edit(req, res) {
  try {
    const { videostoryid } = req.params;
    if (!videostoryid) return res.status(400).json({ error: 'videostoryid param is required' });
    const patch = req.body || {};
    const updated = await model.updateByVideoStoryId(videostoryid, patch);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    return res.json({ item: sanitize(updated) });
  } catch (e) {
    console.error('testimonials.edit error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { add, getAll, deleteOne, edit };
