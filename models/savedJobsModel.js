const { pool } = require('../utils/db');

async function add(userId, jobId) {
  // Upsert and append unique jobId
  const { rows } = await pool.query(
    `INSERT INTO saved_jobs (user_id, job_ids)
     VALUES ($1, ARRAY[$2]::text[])
     ON CONFLICT (user_id)
     DO UPDATE SET job_ids = (
       CASE WHEN NOT ($2 = ANY (saved_jobs.job_ids))
            THEN array_append(saved_jobs.job_ids, $2)
            ELSE saved_jobs.job_ids END
     ), updated_at = now()
     RETURNING user_id, job_ids, created_at, updated_at`,
    [userId, jobId]
  );
  return rows[0];
}

async function remove(userId, jobId) {
  // Ensure row exists and remove jobId if present (idempotent)
  const { rows } = await pool.query(
    `INSERT INTO saved_jobs (user_id, job_ids)
     VALUES ($1, ARRAY[]::text[])
     ON CONFLICT (user_id)
     DO UPDATE SET job_ids = array_remove(saved_jobs.job_ids, $2), updated_at = now()
     RETURNING user_id, job_ids, created_at, updated_at`,
    [userId, jobId]
  );
  return rows[0];
}

async function getByUserId(userId) {
  const { rows } = await pool.query(
    `SELECT user_id, job_ids, created_at, updated_at FROM saved_jobs WHERE user_id=$1`,
    [userId]
  );
  return rows[0] || null;
}

module.exports = { add, remove, getByUserId };
