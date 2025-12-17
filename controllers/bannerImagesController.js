const model = require('../models/bannerImagesModel');

function sanitize(row) {
  if (!row) return null;
  return {
    bannerId: row.banner_image_id,
    bannerImageUrl: row.banner_image_url,
    bannerImageLink: row.banner_image_link,
    bannerPosition: row.banner_position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function add(req, res) {
  try {
    const created = await model.create(req.body || {});
    return res.status(201).json({ item: sanitize(created) });
  } catch (e) {
    console.error('banner.add error:', e);
    if (e && e.message && e.message.includes('required')) {
      return res.status(400).json({ error: e.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getPublic(req, res) {
  try {
    const rows = await model.listPublic();
    return res.json({ items: rows.map(sanitize) });
  } catch (e) {
    console.error('banner.getPublic error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteOne(req, res) {
  try {
    const { bannerid } = req.params;
    if (!bannerid) return res.status(400).json({ error: 'bannerid param is required' });
    const ok = await model.deleteById(bannerid);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    return res.json({ success: true });
  } catch (e) {
    console.error('banner.deleteOne error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { add, getPublic, deleteOne };
