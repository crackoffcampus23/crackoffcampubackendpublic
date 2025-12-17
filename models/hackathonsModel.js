const { pool } = require('../utils/db');
const { generateId } = require('../utils/idGenerator');

const table = 'hackathons';

function normalizeInput(data) {
  const d = data || {};
  return {
    hackathonName: d.hackathonName ?? d.HackathonName ?? null,
    hackathonBannerImageUrl: d.hackathonBannerImageUrl ?? d.HackathonBannerImageUrl ?? null,
    hackathonShortDescription: d.hackathonShortDescription ?? d.HackathonShortDescription ?? null,
    hackathonDate: d.hackathonDate ?? d.HackathonDate ?? null,
    hackathonRegistrationStart: d.hackathonRegistrationStart ?? d.HackathonRegistrationStart ?? null,
    hackathonRegistrationEnd: d.hackathonRegistrationEnd ?? d.HackathonRegistrationEnd ?? null,
    hackathonUrl: d.hackathonUrl ?? d.HackathonUrl ?? null,
    closeRegistration: typeof d.closeRegistration === 'boolean' ? d.closeRegistration : (d.closeRegistration === 'true' ? true : (d.closeRegistration === 'false' ? false : null)),
    published: typeof d.published === 'boolean' ? d.published : (d.published === 'true' ? true : (d.published === 'false' ? false : null)),
  };
}

async function create(data) {
  const hackathon_id = generateId(12);
  const n = normalizeInput(data);
  const { rows } = await pool.query(
    `INSERT INTO ${table} (
      hackathon_id, hackathon_name, hackathon_banner_image_url, hackathon_short_description, hackathon_date, hackathon_registration_start, hackathon_registration_end, hackathon_url, close_registration, published
    ) VALUES ($1,$2,$3,$4,COALESCE($5::date,NULL),COALESCE($6::date,NULL),COALESCE($7::date,NULL),$8,COALESCE($9,false),COALESCE($10,false)) RETURNING *`,
    [hackathon_id, n.hackathonName, n.hackathonBannerImageUrl, n.hackathonShortDescription, n.hackathonDate, n.hackathonRegistrationStart, n.hackathonRegistrationEnd, n.hackathonUrl, n.closeRegistration, n.published]
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
  const result = await pool.query(`DELETE FROM ${table} WHERE hackathon_id = $1`, [id]);
  return result.rowCount > 0;
}

async function updateById(id, patch) {
  const n = normalizeInput(patch);
  const mapping = {
    hackathonName: 'hackathon_name',
    hackathonBannerImageUrl: 'hackathon_banner_image_url',
    hackathonShortDescription: 'hackathon_short_description',
    hackathonDate: 'hackathon_date',
    hackathonRegistrationStart: 'hackathon_registration_start',
    hackathonRegistrationEnd: 'hackathon_registration_end',
    hackathonUrl: 'hackathon_url',
    closeRegistration: 'close_registration',
    published: 'published',
  };
  const fields = [];
  const values = [];
  let i = 1;
  for (const k of Object.keys(mapping)) {
    if (Object.prototype.hasOwnProperty.call(n, k) && n[k] !== undefined) {
      if (k === 'hackathonDate' || k === 'hackathonRegistrationStart' || k === 'hackathonRegistrationEnd') {
        fields.push(`${mapping[k]} = COALESCE($${i++}::date, ${mapping[k]})`);
        values.push(n[k]);
      } else {
        fields.push(`${mapping[k]} = $${i++}`);
        values.push(n[k]);
      }
    }
  }
  if (!fields.length) {
    const { rows } = await pool.query(`SELECT * FROM ${table} WHERE hackathon_id = $1`, [id]);
    return rows[0] || null;
  }
  values.push(id);
  const sql = `UPDATE ${table} SET ${fields.join(', ')}, updated_at = now() WHERE hackathon_id = $${i} RETURNING *`;
  const { rows } = await pool.query(sql, values);
  return rows[0] || null;
}

module.exports = { create, listAll, listPublic, deleteById, updateById };