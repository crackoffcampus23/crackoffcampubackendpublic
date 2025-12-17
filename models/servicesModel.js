const { pool } = require('../utils/db');
const { generateId } = require('../utils/idGenerator');

const table = 'services';

async function create(service) {
  const service_id = service.serviceId || generateId(12);
  const { rows } = await pool.query(
    `INSERT INTO ${table} (service_id, service_title, short_description, duration_meeting, service_charge, more_details_section, what_booking_includes, user_registered, published, button_content)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [
      service_id,
      service.serviceTitle,
      service.shortDescription,
      service.durationMeeting,
      service.serviceCharge,
      service.moreDetailsSection,
      JSON.stringify(service.whatBookingIncludes || []),
      service.userRegistered || 0,
      service.published === true,
      service.buttonContent || null,
    ]
  );
  return rows[0];
}

async function listAll() { const { rows } = await pool.query(`SELECT * FROM ${table} ORDER BY created_at DESC`); return rows; }
async function listPublishedOnly() { const { rows } = await pool.query(`SELECT * FROM ${table} WHERE published=true ORDER BY created_at DESC`); return rows; }
async function get(id) { const { rows } = await pool.query(`SELECT * FROM ${table} WHERE service_id=$1`, [id]); return rows[0] || null; }
async function update(id, payload) {
  const mapping = {
    serviceTitle: 'service_title', shortDescription: 'short_description', durationMeeting: 'duration_meeting', serviceCharge: 'service_charge',
    moreDetailsSection: 'more_details_section', whatBookingIncludes: 'what_booking_includes', userRegistered: 'user_registered', published: 'published',
    buttonContent: 'button_content'
  };
  const fields = []; const values = []; let i = 1;
  for (const k of Object.keys(mapping)) if (payload[k] !== undefined) {
    let val = payload[k];
    if (k === 'whatBookingIncludes') val = JSON.stringify(val || []);
    fields.push(`${mapping[k]}=$${i++}`); values.push(val);
  }
  if (!fields.length) return get(id);
  values.push(id);
  const { rows } = await pool.query(`UPDATE ${table} SET ${fields.join(', ')}, updated_at=now() WHERE service_id=$${i} RETURNING *`, values);
  return rows[0] || null;
}
async function remove(id) { await pool.query(`DELETE FROM ${table} WHERE service_id=$1`, [id]); }
// Provide a generic list() for factory getAll(), and expose specific list helpers as well
async function list() { return listAll(); }

// Check if any service exists at the given date/time slot.
// Expects `service_date` and `service_time` columns in the `services` table.
async function hasConflict({ date, time }) {
  if (!date || !time) return false;
  const { rows } = await pool.query(
    `SELECT 1 FROM ${table} WHERE service_date = $1 AND service_time = $2 LIMIT 1`,
    [date, time]
  );
  return rows.length > 0;
}

module.exports = { create, list, listAll, listPublishedOnly, get, update, remove, hasConflict };
