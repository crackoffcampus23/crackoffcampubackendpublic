const model = require('../models/hackathonsModel');

function sanitize(row) {
  if (!row) return null;
  return {
    hackathonId: row.hackathon_id,
    hackathonName: row.hackathon_name,
    hackathonBannerImageUrl: row.hackathon_banner_image_url,
    hackathonShortDescription: row.hackathon_short_description,
    hackathonDate: row.hackathon_date ? row.hackathon_date.toISOString().split('T')[0] : null,
    hackathonRegistrationStart: row.hackathon_registration_start ? row.hackathon_registration_start.toISOString().split('T')[0] : null,
    hackathonRegistrationEnd: row.hackathon_registration_end ? row.hackathon_registration_end.toISOString().split('T')[0] : null,
    hackathonUrl: row.hackathon_url,
    closeRegistration: row.close_registration,
    published: row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sanitizePublic(row) {
  if (!row) return null;
  return {
    hackathonId: row.hackathon_id,
    hackathonName: row.hackathon_name,
    hackathonBannerImageUrl: row.hackathon_banner_image_url,
    hackathonShortDescription: row.hackathon_short_description,
    hackathonDate: row.hackathon_date ? row.hackathon_date.toISOString().split('T')[0] : null,
    hackathonUrl: row.hackathon_url,
    closeRegistration: row.close_registration,
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
    console.error('hackathons.add error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getAll(req, res) {
  try {
    const rows = await model.listAll();
    return res.json({ items: rows.map(sanitize) });
  } catch (e) {
    console.error('hackathons.getAll error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getPublic(req, res) {
  try {
    const rows = await model.listPublic();
    return res.json({ items: rows.map(sanitizePublic) });
  } catch (e) {
    console.error('hackathons.getPublic error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteOne(req, res) {
  try {
    const { hackathonid } = req.params;
    if (!hackathonid) return res.status(400).json({ error: 'hackathonid param is required' });
    const ok = await model.deleteById(hackathonid);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    return res.json({ success: true });
  } catch (e) {
    console.error('hackathons.deleteOne error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function edit(req, res) {
  try {
    const { hackathonid } = req.params;
    if (!hackathonid) return res.status(400).json({ error: 'hackathonid param is required' });
    const patch = req.body || {};
    const updated = await model.updateById(hackathonid, patch);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    return res.json({ item: sanitize(updated) });
  } catch (e) {
    console.error('hackathons.edit error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { add, getAll, getPublic, deleteOne, edit };