const { pool } = require('../utils/db');

// Generate 8-digit alphanumeric OTP
function generateOTP() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let otp = '';
  for (let i = 0; i < 8; i++) {
    otp += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return otp;
}

// Create or update reset password entry
async function createResetEntry(userId, email) {
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

  // First, deactivate any existing reset entries for this user
  await pool.query(
    'UPDATE reset_password_log SET reset_password = false WHERE user_id = $1 OR email = $2',
    [userId, email]
  );

  // Create new reset entry
  const { rows } = await pool.query(
    `INSERT INTO reset_password_log (user_id, email, otp, reset_password, expires_at)
     VALUES ($1, $2, $3, false, $4) RETURNING *`,
    [userId, email, otp, expiresAt]
  );

  return rows[0];
}

// Refresh OTP for existing email
async function refreshOTP(email) {
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

  const { rows } = await pool.query(
    `UPDATE reset_password_log 
     SET otp = $1, expires_at = $2, reset_password = false, updated_at = now()
     WHERE email = $3 AND expires_at > now()
     RETURNING *`,
    [otp, expiresAt, email]
  );

  return rows[0] || null;
}

// Verify OTP and mark as valid for password reset
async function verifyOTP(email, otp) {
  const { rows } = await pool.query(
    `SELECT * FROM reset_password_log 
     WHERE email = $1 AND otp = $2 AND expires_at > now() AND reset_password = false
     ORDER BY created_at DESC LIMIT 1`,
    [email, otp]
  );

  if (rows.length === 0) {
    return null;
  }

  // Mark as verified for password reset
  await pool.query(
    'UPDATE reset_password_log SET reset_password = true, updated_at = now() WHERE id = $1',
    [rows[0].id]
  );

  return rows[0];
}

// Check if user has valid reset permission
async function checkResetPermission(userId) {
  const { rows } = await pool.query(
    `SELECT * FROM reset_password_log 
     WHERE user_id = $1 AND reset_password = true AND expires_at > now()
     ORDER BY updated_at DESC LIMIT 1`,
    [userId]
  );

  return rows.length > 0 ? rows[0] : null;
}

// Complete password reset (invalidate the reset entry)
async function completePasswordReset(userId) {
  await pool.query(
    'UPDATE reset_password_log SET reset_password = false WHERE user_id = $1',
    [userId]
  );
}

// Clean up expired entries (can be called periodically)
async function cleanupExpiredEntries() {
  const { rowCount } = await pool.query(
    'DELETE FROM reset_password_log WHERE expires_at < now()'
  );
  return rowCount;
}

// Get reset entry by email (for checking status)
async function getResetEntryByEmail(email) {
  const { rows } = await pool.query(
    `SELECT * FROM reset_password_log 
     WHERE email = $1 AND expires_at > now()
     ORDER BY created_at DESC LIMIT 1`,
    [email]
  );

  return rows[0] || null;
}

module.exports = {
  generateOTP,
  createResetEntry,
  refreshOTP,
  verifyOTP,
  checkResetPermission,
  completePasswordReset,
  cleanupExpiredEntries,
  getResetEntryByEmail
};