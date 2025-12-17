const { pool } = require('../utils/db');

async function upsertByPaymentId(payload) {
  const {
    userId,
    type,
    planType,
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
    verified,
    raw_response
  } = payload;

  const sql = `
    INSERT INTO payments (user_id, type, plan_type, razorpay_payment_id, razorpay_order_id, razorpay_signature, verified, raw_response)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (razorpay_payment_id)
    DO UPDATE SET
      user_id = EXCLUDED.user_id,
      type = EXCLUDED.type,
      plan_type = EXCLUDED.plan_type,
      razorpay_order_id = EXCLUDED.razorpay_order_id,
      razorpay_signature = EXCLUDED.razorpay_signature,
      verified = EXCLUDED.verified,
      raw_response = EXCLUDED.raw_response,
      updated_at = now()
    RETURNING *;
  `;
  const { rows } = await pool.query(sql, [
    userId,
    type || null,
    planType || null,
    razorpay_payment_id,
    razorpay_order_id || null,
    razorpay_signature || null,
    !!verified,
    raw_response ? JSON.stringify(raw_response) : null
  ]);
  return rows[0];
}

async function getByPaymentId(razorpay_payment_id) {
  const { rows } = await pool.query('SELECT * FROM payments WHERE razorpay_payment_id=$1', [razorpay_payment_id]);
  return rows[0] || null;
}
async function listByUserId(userId) {
  const { rows } = await pool.query(
    'SELECT * FROM payments WHERE user_id=$1 ORDER BY created_at DESC',
    [userId]
  );
  return rows;
}

module.exports = { upsertByPaymentId, getByPaymentId, listByUserId };
