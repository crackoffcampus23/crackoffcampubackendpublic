const { pool } = require('../utils/db');
const { generateId } = require('../utils/idGenerator');

const table = 'sponsorship_marquee';

async function create({ imageUrl, companyName }) {
  const sponsor_id = generateId(12);
  const { rows } = await pool.query(
    `INSERT INTO ${table} (sponsor_id, image_url, company_name) VALUES ($1,$2,$3) RETURNING *`,
    [sponsor_id, imageUrl, companyName ?? null]
  );
  return rows[0];
}

async function listAll() {
  const { rows } = await pool.query(`SELECT * FROM ${table} ORDER BY created_at DESC`);
  return rows;
}

async function deleteById(id) {
  const result = await pool.query(`DELETE FROM ${table} WHERE sponsor_id = $1`, [id]);
  return result.rowCount > 0;
}

module.exports = { create, listAll, deleteById };
