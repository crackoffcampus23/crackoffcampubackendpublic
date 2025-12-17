const model = require('../models/adBannerModel');

function sanitize(row) {
  if (!row) return null;
  return {
    appUrl: row.app_url,
    published: row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function create(req, res) {
  try {
    const { appUrl, published } = req.body || {};
    const row = await model.upsert(appUrl, published);
    return res.status(201).json({ item: sanitize(row) });
  } catch (e) {
    console.error('adbanner.create error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function get(req, res) {
  try {
    const row = await model.get();
    if (!row || !row.published) {
      return res.json({ published: false, appUrl: null });
    }
    return res.json({ published: true, appUrl: row.app_url });
  } catch (e) {
    console.error('adbanner.get error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function update(req, res) {
  try {
    const patch = req.body || {};
    const row = await model.updatePartial(patch);
    if (!row) return res.status(404).json({ error: 'Not found' });
    return res.json({ item: sanitize(row) });
  } catch (e) {
    console.error('adbanner.update error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function reset(req, res) {
  try {
    const row = await model.reset();
    return res.json({ item: sanitize(row) });
  } catch (e) {
    console.error('adbanner.reset error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { create, get, update, reset };