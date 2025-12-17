const services = require('../models/servicesModel');
const { makeController } = require('./crudFactory');
const notificationModel = require('../models/notificationModel');

const mapping = {
  serviceId: 'service_id',
  serviceTitle: 'service_title',
  shortDescription: 'short_description',
  durationMeeting: 'duration_meeting',
  serviceCharge: 'service_charge',
  moreDetailsSection: 'more_details_section',
  whatBookingIncludes: 'what_booking_includes',
  userRegistered: 'user_registered',
  published: 'published',
  buttonContent: 'button_content',
  mostpopular: 'mostpopular',
};

const base = makeController(services, 'serviceid', mapping);

function sanitize(row) {
  if (!row) return null;
  const o = {};
  for (const [apiKey, dbKey] of Object.entries(mapping)) o[apiKey] = row[dbKey];
  o.createdAt = row.created_at;
  o.updatedAt = row.updated_at;
  return o;
}

async function getUserServices(req, res) {
  try { const rows = await services.listPublishedOnly(); res.json({ items: rows.map(sanitize) }); } catch (e) { console.error('getUserServices error', e); res.status(500).json({ error: 'Internal server error' }); }
}
async function getAdminServices(req, res) {
  try { const rows = await services.listAll(); res.json({ items: rows.map(sanitize) }); } catch (e) { console.error('getAdminServices error', e); res.status(500).json({ error: 'Internal server error' }); }
}

async function getMostPopularStatus(req, res) {
  try {
    const id = req.params.serviceid;
    const row = await services.get(id);
    if (!row) return res.status(404).json({ error: 'Service not found' });
    const item = sanitize(row);
    res.json({ mostpopular: !!item.mostpopular });
  } catch (e) {
    console.error('getMostPopularStatus error', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateMostPopular(req, res) {
  try {
    const id = req.params.serviceid;
    const { mostpopular } = req.body || {};
    if (typeof mostpopular !== 'boolean') {
      return res.status(400).json({ error: 'mostpopular must be boolean' });
    }
    const updated = await services.update(id, { mostpopular });
    if (!updated) return res.status(404).json({ error: 'Service not found' });
    const item = sanitize(updated);
    res.json({ mostpopular: !!item.mostpopular, item });
  } catch (e) {
    console.error('updateMostPopular error', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Override add to create notification when a new service is added
async function add(req, res) {
  try {
    const created = await services.create(req.body || {});
    const item = sanitize(created);
    
    // Create notification for new service (global notification for all users)
    if (item.published) {
      try {
        await notificationModel.createGlobal({
          type: 'new_service',
          title: `New Service: ${item.serviceTitle || 'Available'}`,
          message: item.shortDescription || '',
          referenceId: item.serviceId
        });
      } catch (notifError) {
        console.error('Error creating notification:', notifError);
        // Don't fail the service creation if notification fails
      }
    }
    
    res.status(201).json({ serviceid: item.serviceId, item });
  } catch (e) {
    console.error('add service error', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { ...base, add, getUserServices, getAdminServices, getMostPopularStatus, updateMostPopular };
