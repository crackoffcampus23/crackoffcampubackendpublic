const { pool } = require('../utils/db');

const table = 'user_interview_kits';

async function upsertForUserKit(userId, kitId, kitUrl) {
  const { rows } = await pool.query(
    `INSERT INTO ${table} (user_id, kit_id, kit_url)
     VALUES ($1,$2,$3)
     ON CONFLICT (user_id, kit_id)
     DO UPDATE SET kit_url = EXCLUDED.kit_url, updated_at = now()
     RETURNING *`,
    [userId, kitId, kitUrl]
  );
  return rows[0];
}

async function getForUser(userId, kitId) {
  const { rows } = await pool.query(
    `SELECT * FROM ${table} WHERE user_id=$1 AND kit_id=$2`,
    [userId, kitId]
  );
  return rows[0] || null;
}

async function listAllForUser(userId) {
  const { rows } = await pool.query(
    `SELECT uik.*, ipk.kit_name
     FROM ${table} uik
     JOIN interview_preperation_kit ipk ON uik.kit_id = ipk.kit_id
     WHERE uik.user_id = $1`,
    [userId]
  );
  return rows;
}

module.exports = { upsertForUserKit, getForUser, listAllForUser };
