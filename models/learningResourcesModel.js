const { pool } = require('../utils/db');
const { generateId } = require('../utils/idGenerator');

const table = 'learning_resources';

function normalizeInput(data) {
  const d = data || {};
  return {
    resourceName: d.resourceName ?? d.ResourceName ?? null,
    resourceLaunchAuthority: d.resourceLaunchAuthority ?? d.ResourceLaunchAuthority ?? null,
    rating: d.rating !== undefined ? Number(d.rating) : null,
    totalReviews: d.totalReviews !== undefined ? parseInt(d.totalReviews, 10) : null,
    downloadURL: d.downloadURL ?? d.downloadUrl ?? d.DownloadURL ?? null,
    bannerImageUrl: d.bannerImageUrl ?? d.BannerImageUrl ?? null,
    published: typeof d.published === 'boolean' ? d.published : (d.published === 'true' ? true : (d.published === 'false' ? false : null)),
  };
}

async function create(data) {
  const resource_id = generateId(13);
  const n = normalizeInput(data);
  const { rows } = await pool.query(
    `INSERT INTO ${table} (
      resource_id, resource_name, resource_launch_authority, rating, total_reviews, download_url, banner_image_url, published
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,false)) RETURNING *`,
    [resource_id, n.resourceName, n.resourceLaunchAuthority, n.rating, n.totalReviews, n.downloadURL, n.bannerImageUrl, n.published]
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
  const result = await pool.query(`DELETE FROM ${table} WHERE resource_id = $1`, [id]);
  return result.rowCount > 0;
}

async function updateById(id, patch) {
  const n = normalizeInput(patch);
  const mapping = {
    resourceName: 'resource_name',
    resourceLaunchAuthority: 'resource_launch_authority',
    rating: 'rating',
    totalReviews: 'total_reviews',
    downloadURL: 'download_url',
    bannerImageUrl: 'banner_image_url',
    published: 'published',
  };
  const fields = [];
  const values = [];
  let i = 1;
  for (const k of Object.keys(mapping)) {
    if (Object.prototype.hasOwnProperty.call(n, k) && n[k] !== undefined) {
      fields.push(`${mapping[k]} = $${i++}`);
      values.push(n[k]);
    }
  }
  if (!fields.length) {
    const { rows } = await pool.query(`SELECT * FROM ${table} WHERE resource_id = $1`, [id]);
    return rows[0] || null;
  }
  values.push(id);
  const sql = `UPDATE ${table} SET ${fields.join(', ')}, updated_at = now() WHERE resource_id = $${i} RETURNING *`;
  const { rows } = await pool.query(sql, values);
  return rows[0] || null;
}

module.exports = { create, listAll, listPublic, deleteById, updateById };