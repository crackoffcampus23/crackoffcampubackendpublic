const { pool } = require('../utils/db');
const { generateId } = require('../utils/idGenerator');

const table = 'resources';

async function create(resource) {
  const resource_id = resource.resourceId || generateId(12);
  const { rows } = await pool.query(
    `INSERT INTO ${table} (resource_id, resource_name, short_description, what_you_get, download_link, resource_fee, total_downloads, published, banner_image)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [
      resource_id,
      resource.resourceName,
      resource.shortDescription,
      resource.whatYouGet,
      resource.downloadLink,
      resource.resourceFee,
      resource.totalDownloads || 0,
      resource.published === true,
      resource.imageBannerLink
    ]
  );
  return rows[0];
}

async function listAll() { const { rows } = await pool.query(`SELECT * FROM ${table} ORDER BY created_at DESC`); return rows; }
async function listPublishedOnly() { const { rows } = await pool.query(`SELECT * FROM ${table} WHERE published=true ORDER BY created_at DESC`); return rows; }
async function get(id) { const { rows } = await pool.query(`SELECT * FROM ${table} WHERE resource_id=$1`, [id]); return rows[0] || null; }
async function update(id, payload) {
  const mapping = {
    resourceName: 'resource_name', shortDescription: 'short_description', whatYouGet: 'what_you_get', downloadLink: 'download_link', resourceFee: 'resource_fee', totalDownloads: 'total_downloads', published: 'published', imageBannerLink
: 'banner_image'
  };
  const fields = []; const values = []; let i = 1;
  for (const k of Object.keys(mapping)) if (payload[k] !== undefined) { fields.push(`${mapping[k]}=$${i++}`); values.push(payload[k]); }
  if (!fields.length) return get(id);
  values.push(id);
  const { rows } = await pool.query(`UPDATE ${table} SET ${fields.join(', ')}, updated_at=now() WHERE resource_id=$${i} RETURNING *`, values);
  return rows[0] || null;
}
async function remove(id) { await pool.query(`DELETE FROM ${table} WHERE resource_id=$1`, [id]); }
// Provide a generic list() for factory getAll(), and expose specific list helpers as well
async function list() { return listAll(); }
// Increment total_downloads by 1 for a given resource
async function incrementTotalDownloads(id) {
  await pool.query(`UPDATE ${table} SET total_downloads = COALESCE(total_downloads, 0) + 1, updated_at=now() WHERE resource_id=$1`, [id]);
}

module.exports = { create, list, listAll, listPublishedOnly, get, update, remove, incrementTotalDownloads };
