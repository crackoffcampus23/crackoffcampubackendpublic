const { pool } = require('../utils/db');

function generateId(len = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function createOrUpdateVerification(payload) {
  const {
    userId,
    name,
    email,
    phoneNumber,
    state,
    language,
    resumeURL,
    serviceNeeded,
    slotDate,
    slotTime,
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
    payment_verified,
    raw_response
  } = payload;

  // If a record already exists for this payment_id, update it; otherwise insert with a new service_id
  const existing = await pool.query('SELECT * FROM service_verifications WHERE razorpay_payment_id=$1', [razorpay_payment_id]);
  if (existing.rows[0]) {
    const { rows } = await pool.query(
      `UPDATE service_verifications
       SET user_id=$1, name=$2, email=$3, phone_number=$4, state=$5, language=$6,
           resume_url=$7, service_needed=$8, slot_date=$9, slot_time=$10,
           razorpay_order_id=$11, razorpay_signature=$12,
           payment_verified=$13, raw_response=$14, updated_at=now()
       WHERE razorpay_payment_id=$15
       RETURNING *`,
      [
        userId,
        name,
        email,
        phoneNumber,
        state,
        language,
        resumeURL,
        serviceNeeded,
        slotDate || null,
        slotTime || null,
        razorpay_order_id,
        razorpay_signature,
        !!payment_verified,
        raw_response || null,
        razorpay_payment_id,
      ]
    );
    return rows[0];
  }

  // generate unique service_id
  let serviceId;
  for (let attempts = 0; attempts < 5; attempts++) {
    serviceId = generateId();
    const { rows } = await pool.query('SELECT 1 FROM service_verifications WHERE service_id=$1', [serviceId]);
    if (!rows[0]) break;
    serviceId = null;
  }
  if (!serviceId) {
    throw new Error('Failed to generate unique service_id');
  }

  const { rows } = await pool.query(
    `INSERT INTO service_verifications (
      service_id, user_id, name, email, phone_number, state, language, resume_url,
      service_needed, slot_date, slot_time, razorpay_payment_id, razorpay_order_id, razorpay_signature,
      payment_verified, raw_response
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
    RETURNING *`,
    [
      serviceId,
      userId,
      name,
      email,
      phoneNumber,
      state,
      language,
      resumeURL,
      serviceNeeded,
      slotDate || null,
      slotTime || null,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      !!payment_verified,
      raw_response || null,
    ]
  );
  return rows[0];
}

module.exports = { createOrUpdateVerification };

async function listAll() {
  const { rows } = await pool.query('SELECT * FROM service_verifications ORDER BY created_at DESC');
  return rows;
}

module.exports.listAll = listAll;
