const { pool } = require('../utils/db');
const { generateId } = require('../utils/idGenerator');

const table = 'events';

function normalizeInput(data) {
  const d = data || {};
  return {
    eventBannerImageUrl: d.eventBannerImageUrl ?? d.EventBannerImageUrl ?? null,
    eventName: d.eventName ?? d.EventName ?? null,
    eventDate: d.eventDate ?? d.EventDate ?? null,
    eventShortDescription: d.eventShortDescription ?? d.EventShortDescription ?? null,
    eventRegistrationStart: d.eventRegistrationStart ?? d.EventRegistrationStart ?? null,
    eventRegistrationEnd: d.eventRegistrationEnd ?? d.EventRegistrationEnd ?? null,
    eventUrl: d.eventUrl ?? d.EventUrl ?? null,
    closeRegistration: typeof d.closeRegistration === 'boolean' ? d.closeRegistration : (d.closeRegistration === 'true' ? true : (d.closeRegistration === 'false' ? false : null)),
    published: typeof d.published === 'boolean' ? d.published : (d.published === 'true' ? true : (d.published === 'false' ? false : null)),
  };
}

async function create(data) {
  const event_id = generateId(12);
  const n = normalizeInput(data);
  const { rows } = await pool.query(
    `INSERT INTO ${table} (
      event_id, event_banner_image_url, event_name, event_date, event_short_description, event_registration_start, event_registration_end, event_url, close_registration, published
    ) VALUES ($1,$2,$3,COALESCE($4::date,NULL),$5,COALESCE($6::date,NULL),COALESCE($7::date,NULL),$8,COALESCE($9,false),COALESCE($10,false)) RETURNING *`,
    [event_id, n.eventBannerImageUrl, n.eventName, n.eventDate, n.eventShortDescription, n.eventRegistrationStart, n.eventRegistrationEnd, n.eventUrl, n.closeRegistration, n.published]
  );
  return rows[0];
}

async function listAll() {
  const { rows } = await pool.query(`SELECT * FROM ${table} ORDER BY created_at DESC`);
  return rows;
}

async function listPublic() {
  const { rows } = await pool.query(`SELECT * FROM ${table} WHERE published = true ORDER BY created_at DESC`);
  return rows;
}

async function deleteById(id) {
  const result = await pool.query(`DELETE FROM ${table} WHERE event_id = $1`, [id]);
  return result.rowCount > 0;
}

async function updateById(id, patch) {
  const n = normalizeInput(patch);
  const mapping = {
    eventBannerImageUrl: 'event_banner_image_url',
    eventName: 'event_name',
    eventDate: 'event_date',
    eventShortDescription: 'event_short_description',
    eventRegistrationStart: 'event_registration_start',
    eventRegistrationEnd: 'event_registration_end',
    eventUrl: 'event_url',
    closeRegistration: 'close_registration',
    published: 'published',
  };
  const fields = [];
  const values = [];
  let i = 1;
  for (const k of Object.keys(mapping)) {
    if (Object.prototype.hasOwnProperty.call(n, k) && n[k] !== undefined) {
      if (k === 'eventDate' || k === 'eventRegistrationStart' || k === 'eventRegistrationEnd') {
        fields.push(`${mapping[k]} = COALESCE($${i++}::date, ${mapping[k]})`);
        values.push(n[k]);
      } else {
        fields.push(`${mapping[k]} = $${i++}`);
        values.push(n[k]);
      }
    }
  }
  if (!fields.length) {
    const { rows } = await pool.query(`SELECT * FROM ${table} WHERE event_id = $1`, [id]);
    return rows[0] || null;
  }
  values.push(id);
  const sql = `UPDATE ${table} SET ${fields.join(', ')}, updated_at = now() WHERE event_id = $${i} RETURNING *`;
  const { rows } = await pool.query(sql, values);
  return rows[0] || null;
}

module.exports = { create, listAll, listPublic, deleteById, updateById };