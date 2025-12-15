const model = require('../models/sponsorshipMarqueeModel');

function sanitize(row) {
  if (!row) return null;
  return {
    id: row.sponsor_id,
    imageUrl: row.image_url,
    companyName: row.company_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function add(req, res) {
  try {
    const { imageUrl, companyName } = req.body || {};
    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required' });
    }
    const created = await model.create({ imageUrl, companyName: companyName ?? null });
    return res.status(201).json({ item: sanitize(created) });
  } catch (e) {
    console.error('sponsorshipMarquee.add error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getAll(req, res) {
  try {
    const rows = await model.listAll();
    return res.json({ items: rows.map(sanitize) });
  } catch (e) {
    console.error('sponsorshipMarquee.getAll error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteOne(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'id param is required' });
    const ok = await model.deleteById(id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    return res.json({ success: true });
  } catch (e) {
    console.error('sponsorshipMarquee.deleteOne error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { add, getAll, deleteOne };
