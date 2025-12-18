const { pool } = require('../utils/db');
const { generateId } = require('../utils/idGenerator');

const table = 'userfeedback';

async function create({ name, phonenumber, proofUrl, feedbackType, message, profileUrl }) {
  const feedback_id = generateId(9);
  const { rows } = await pool.query(
    `INSERT INTO ${table} (feedback_id, name, phone_number, proof_url, feedback_type, message, profile_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      feedback_id,
      name || null,
      phonenumber || null,
      proofUrl || null,
      feedbackType || null,
      message || null,
      profileUrl || null,
    ]
  );
  return rows[0];
}

async function listAll() {
  const { rows } = await pool.query(`SELECT * FROM ${table} ORDER BY created_at DESC`);
  return rows;
}

async function deleteById(id) {
  const result = await pool.query(`DELETE FROM ${table} WHERE feedback_id=$1`, [id]);
  return result.rowCount > 0;
}

module.exports = { create, listAll, deleteById };
