const { pool } = require('../utils/db');
const { generateId } = require('../utils/idGenerator');

const table = 'bannerimages';

function normalizeInput(data) {
  const d = data || {};
  const url = d.bannerImageUrl ?? d.BannerImageUrl ?? d.imageUrl ?? null;
  const link = d.bannerImageLink ?? d.BannerImageLink ?? d.link ?? null;
  const posRaw = d.bannerPosition ?? d.BannerPosition ?? d.position ?? null;
  const position = posRaw !== null && posRaw !== undefined ? Number(posRaw) : null;
  return { url, link, position };
}

async function create(payload) {
  const id = generateId(7);
  const { url, link, position } = normalizeInput(payload);
  if (!url || position === null || Number.isNaN(position)) {
    throw new Error('bannerImageUrl and numeric bannerPosition are required');
  }
  const { rows } = await pool.query(
    `INSERT INTO ${table} (banner_image_id, banner_image_url, banner_image_link, banner_position)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [id, url, link, position]
  );
  return rows[0];
}

async function listPublic() {
  const { rows } = await pool.query(
    `SELECT * FROM ${table} ORDER BY banner_position ASC, created_at DESC`
  );
  return rows;
}

async function deleteById(id) {
  const result = await pool.query(
    `DELETE FROM ${table} WHERE banner_image_id=$1`,
    [id]
  );
  return result.rowCount > 0;
}

module.exports = { create, listPublic, deleteById };
