const { pool } = require('../utils/db');

async function findByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email=$1 LIMIT 1', [email]);
  return rows[0] || null;
}

async function findById(userId) {
  const { rows } = await pool.query('SELECT * FROM users WHERE user_id=$1 LIMIT 1', [userId]);
  return rows[0] || null;
}

async function createUser({ userId, email, fullName, passwordHash, phoneNumber }) {
  const { rows } = await pool.query(
    `INSERT INTO users (user_id, email, full_name, password_hash, phone_number) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [userId, email, fullName, passwordHash || null, phoneNumber || null]
  );
  return rows[0];
}

async function listUsers() {
  const { rows } = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
  return rows;
}

async function deleteUser(userId) {
  // Optionally remove dependent rows; assuming user_details has FK on user_id with ON DELETE CASCADE.
  // If not, explicitly delete from user_details first.
  await pool.query('DELETE FROM user_details WHERE user_id=$1', [userId]);
  await pool.query('DELETE FROM users WHERE user_id=$1', [userId]);
}

module.exports = { findByEmail, findById, createUser, listUsers, deleteUser };
