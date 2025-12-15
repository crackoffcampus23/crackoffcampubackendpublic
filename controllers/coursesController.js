const model = require('../models/coursesModel');

function sanitize(row) {
  if (!row) return null;
  let languages = [];
  if (row.languages) {
    if (Array.isArray(row.languages)) {
      languages = row.languages;
    } else if (typeof row.languages === 'object') {
      languages = row.languages; // jsonb object/array
    } else if (typeof row.languages === 'string') {
      try { languages = JSON.parse(row.languages); } catch (_) { languages = []; }
    }
  }
  return {
    courseId: row.course_id,
    courseType: row.course_type,
    bannerImageUrl: row.banner_image_url,
    courseName: row.course_name,
    languages,
    duration: row.duration,
    courseUrl: row.course_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function add(req, res) {
  try {
    const created = await model.create(req.body || {});
    return res.status(201).json({ item: sanitize(created) });
  } catch (e) {
    console.error('courses.add error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getAll(req, res) {
  try {
    const rows = await model.listAll();
    return res.json({ items: rows.map(sanitize) });
  } catch (e) {
    console.error('courses.getAll error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteOne(req, res) {
  try {
    const { courseid } = req.params;
    if (!courseid) return res.status(400).json({ error: 'courseid param is required' });
    const ok = await model.deleteById(courseid);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    return res.json({ success: true });
  } catch (e) {
    console.error('courses.deleteOne error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function edit(req, res) {
  try {
    const { courseid } = req.params;
    if (!courseid) return res.status(400).json({ error: 'courseid param is required' });
    const patch = req.body || {};
    const updated = await model.updateById(courseid, patch);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    return res.json({ item: sanitize(updated) });
  } catch (e) {
    console.error('courses.edit error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { add, getAll, deleteOne, edit };
