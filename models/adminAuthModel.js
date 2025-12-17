const { pool } = require('../utils/db');

async function findByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM admin_auth WHERE email = $1', [email]);
  return rows[0] || null;
}

async function createAdmin({ email, passwordHash, role = 'admin' }) {
  const { rows } = await pool.query(
    `INSERT INTO admin_auth (email, password_hash, role)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [email, passwordHash, role]
  );
  return rows[0];
}

async function listAdmins() {
  const { rows } = await pool.query(
    'SELECT id, email, role, created_at, updated_at FROM admin_auth ORDER BY created_at DESC'
  );
  return rows;
}

async function deleteByEmail(email) {
  const { rowCount } = await pool.query('DELETE FROM admin_auth WHERE email = $1', [email]);
  return rowCount > 0;
}

async function updatePasswordByEmail(email, newPasswordHash) {
  const { rows } = await pool.query(
    `UPDATE admin_auth
     SET password_hash = $1, updated_at = now()
     WHERE email = $2
     RETURNING *`,
    [newPasswordHash, email]
  );
  return rows[0] || null;
}

module.exports = { findByEmail, createAdmin, deleteByEmail, updatePasswordByEmail, listAdmins };
