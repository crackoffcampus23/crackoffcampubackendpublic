const { pool } = require('../utils/db');
const { generateId } = require('../utils/idGenerator');

const table = 'previously_asked_questions';

async function create(item) {
  const question_id = item.questionId || generateId(12);
  const { rows } = await pool.query(
    `INSERT INTO ${table} (question_id, company_name, company_role, download_url, total_downloads)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [question_id, item.companyName, item.companyRole, item.downlloadUrl || item.downloadUrl, item.totalDownloads || 0]
  );
  return rows[0];
}
async function list() { const { rows } = await pool.query(`SELECT * FROM ${table} ORDER BY created_at DESC`); return rows; }
async function get(id) { const { rows } = await pool.query(`SELECT * FROM ${table} WHERE question_id=$1`, [id]); return rows[0] || null; }
async function update(id, payload) {
  const mapping = { companyName: 'company_name', companyRole: 'company_role', downloadUrl: 'download_url', downlloadUrl: 'download_url', totalDownloads: 'total_downloads' };
  const fields = []; const values = []; let i = 1;
  for (const k of Object.keys(mapping)) if (payload[k] !== undefined) { fields.push(`${mapping[k]}=$${i++}`); values.push(payload[k]); }
  if (!fields.length) return get(id);
  values.push(id);
  const { rows } = await pool.query(`UPDATE ${table} SET ${fields.join(', ')}, updated_at=now() WHERE question_id=$${i} RETURNING *`, values);
  return rows[0] || null;
}
async function remove(id) { await pool.query(`DELETE FROM ${table} WHERE question_id=$1`, [id]); }

module.exports = { create, list, get, update, remove };
