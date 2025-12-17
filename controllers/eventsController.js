const model = require('../models/eventsModel');

function sanitize(row) {
  if (!row) return null;
  return {
    eventId: row.event_id,
    eventBannerImageUrl: row.event_banner_image_url,
    eventName: row.event_name,
    eventDate: row.event_date ? row.event_date.toISOString().split('T')[0] : null,
    eventShortDescription: row.event_short_description,
    eventRegistrationStart: row.event_registration_start ? row.event_registration_start.toISOString().split('T')[0] : null,
    eventRegistrationEnd: row.event_registration_end ? row.event_registration_end.toISOString().split('T')[0] : null,
    eventUrl: row.event_url,
    closeRegistration: row.close_registration,
    published: row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sanitizePublic(row) {
  if (!row) return null;
  return {
    eventId: row.event_id,
    eventBannerImageUrl: row.event_banner_image_url,
    eventName: row.event_name,
    eventDate: row.event_date ? row.event_date.toISOString().split('T')[0] : null,
    eventShortDescription: row.event_short_description,
    eventUrl: row.event_url,
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
    console.error('events.add error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getAll(req, res) {
  try {
    const rows = await model.listAll();
    return res.json({ items: rows.map(sanitize) });
  } catch (e) {
    console.error('events.getAll error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getPublic(req, res) {
  try {
    const rows = await model.listPublic();
    return res.json({ items: rows.map(sanitizePublic) });
  } catch (e) {
    console.error('events.getPublic error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteOne(req, res) {
  try {
    const { eventid } = req.params;
    if (!eventid) return res.status(400).json({ error: 'eventid param is required' });
    const ok = await model.deleteById(eventid);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    return res.json({ success: true });
  } catch (e) {
    console.error('events.deleteOne error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function edit(req, res) {
  try {
    const { eventid } = req.params;
    if (!eventid) return res.status(400).json({ error: 'eventid param is required' });
    const patch = req.body || {};
    const updated = await model.updateById(eventid, patch);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    return res.json({ item: sanitize(updated) });
  } catch (e) {
    console.error('events.edit error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { add, getAll, getPublic, deleteOne, edit };