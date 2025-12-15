const { pool } = require('../utils/db');

const table = 'user_resources';

async function upsertForUserResource(userId, resourceId, signedUrl) {
  const { rows } = await pool.query(
    `INSERT INTO ${table} (user_id, resource_id, signed_url)
     VALUES ($1,$2,$3)
     ON CONFLICT (user_id, resource_id)
     DO UPDATE SET signed_url = EXCLUDED.signed_url, updated_at = now()
     RETURNING *`,
    [userId, resourceId, signedUrl]
  );
  return rows[0];
}

async function getForUser(userId, resourceId) {
  const { rows } = await pool.query(
    `SELECT * FROM ${table} WHERE user_id=$1 AND resource_id=$2`,
    [userId, resourceId]
  );
  return rows[0] || null;
}

async function listAllForUser(userId) {
  const { rows } = await pool.query(
    `SELECT ur.*, r.resource_name
     FROM ${table} ur
     JOIN resources r ON ur.resource_id = r.resource_id
     WHERE ur.user_id = $1`,
    [userId]
  );
  return rows;
}

module.exports = { upsertForUserResource, getForUser, listAllForUser };
