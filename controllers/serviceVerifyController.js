const axios = require('axios');
const crypto = require('crypto');
const { createOrUpdateVerification, listAll } = require('../models/serviceVerificationModel');
const { sendEmail } = require('../utils/emailService');

function sanitize(row) {
  if (!row) return null;
  return {
    serviceId: row.service_id,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    phoneNumber: row.phone_number,
    state: row.state,
    language: row.language,
    resumeURL: row.resume_url,
    serviceNeeded: row.service_needed,
    slotDate: row.slot_date,
    slotTime: row.slot_time,
    razorpayPaymentId: row.razorpay_payment_id,
    paymentVerified: row.payment_verified,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function verifyService(req, res) {
  try {
    const body = req.body || {};
    const {
      userId,
      Name: NameRaw,
      Email: EmailRaw,
      PhoneNumber: PhoneRaw,
      State: StateRaw,
      Language: LanguageRaw,
      resumeURL,
      serviceNeeded,
      slotDate,
      slotTime,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature
    } = body;

    const name = NameRaw || body.name;
    const email = EmailRaw || body.email;
    const phoneNumber = PhoneRaw || body.phoneNumber;
    const state = StateRaw || body.state;
    const language = LanguageRaw || body.language;

    if (!userId || !name || !email || !serviceNeeded || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ error: 'userId, name, email, serviceNeeded, razorpay_payment_id, razorpay_order_id, razorpay_signature are required' });
    }

    // Auth: user can only verify own unless admin
    const isAdmin = req.user && req.user.role === 'admin';
    const selfId = req.user && req.user.sub;
    if (!isAdmin && selfId !== userId) {
      return res.status(403).json({ error: 'Forbidden: cannot verify service for another user' });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return res.status(500).json({ error: 'Server misconfigured: Razorpay keys missing' });
    }

    // Verify signature
    const expectedSig = crypto
      .createHmac('sha256', keySecret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');
    if (expectedSig !== razorpay_signature) {
      return res.status(400).json({ error: 'Signature mismatch' });
    }

    // Fetch from Razorpay for ground truth
    let rpResp;
    try {
      rpResp = await axios.get(`https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}` , {
        auth: { username: keyId, password: keySecret },
        timeout: 10000
      });
    } catch (err) {
      const data = err.response && err.response.data;
      if (data && data.error && data.error.code === 'BAD_REQUEST_ERROR') {
        return res.status(400).json({ error: 'Payment ID not found or invalid' });
      }
      console.error('Razorpay fetch error', err.message);
      return res.status(502).json({ error: 'Upstream payment verification failed' });
    }

    const paymentData = rpResp.data;
    if (paymentData && paymentData.status && !['captured', 'authorized'].includes(paymentData.status)) {
      return res.status(400).json({ error: `Payment status not acceptable: ${paymentData.status}` });
    }

    // Persist request
    const row = await createOrUpdateVerification({
      userId,
      name,
      email,
      phoneNumber: phoneNumber || null,
      state: state || null,
      language: language || null,
      resumeURL: resumeURL || null,
      serviceNeeded,
      slotDate: slotDate || null,
      slotTime: slotTime || null,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      payment_verified: true,
      raw_response: paymentData
    });

    // Send confirmation emails (user then admin)
    const prettyServiceName = serviceNeeded;
    const userSubject = `Your Slot is Confirmed – ${prettyServiceName}`;
    const userText = `Hi ${name},\n\nYour slot has been successfully booked for ${prettyServiceName} on ${slotDate || '—'} at ${slotTime || '—'}.\nYou will receive the session link on your registered email before the scheduled time.\n\nThank you for choosing Crack Off-Campus Service.\n\nBest Regards,\nTeam Crack Off-Campus`;
    const userHtml = `
      <div style="font-family:Arial, sans-serif; max-width:600px; margin:0 auto;">
        <h2 style="color:#333;">Your Slot is Confirmed – ${prettyServiceName}</h2>
        <p>Dear ${name},</p>
        <p>Your slot has been successfully booked for <strong>${prettyServiceName}</strong> on <strong>${slotDate || '—'}</strong> at <strong>${slotTime || '—'}</strong>.</p>
        <p>You will receive the session link on your registered email before the scheduled time.</p>
        <p>Thank you for choosing Crack Off-Campus Service.</p>
        <br>
        <p>Best Regards,<br>Team Crack Off-Campus</p>
      </div>
    `;

    const adminSubject = 'New Slot Booked';
    const adminText = `Dear Admin,\n\nA new slot has been booked by ${name} (${email}) for ${prettyServiceName} on ${slotDate || '—'} at ${slotTime || '—'}.\n\nRegards,\nTeam Crack Off-Campus`;
    const adminHtml = `
      <div style="font-family:Arial, sans-serif; max-width:600px; margin:0 auto;">
        <h2 style="color:#333;">New slot booked</h2>
        <p>Dear Admin,</p>
        <p>A new slot has been booked by <strong>${name}</strong> (<a href="mailto:${email}">${email}</a>) for <strong>${prettyServiceName}</strong> on <strong>${slotDate || '—'}</strong> at <strong>${slotTime || '—'}</strong>.</p>
        <br>
        <p>Regards,<br>Team Crack Off-Campus</p>
      </div>
    `;

    // Best-effort emails; don't fail the API if email fails
    try {
      await sendEmail({ to: email, subject: userSubject, text: userText, html: userHtml });
    } catch (e) {
      console.warn('User email send failed for service verification', e.message);
    }
    try {
      await sendEmail({ to: 'crackoffcampus63@gmail.com', subject: adminSubject, text: adminText, html: adminHtml });
    } catch (e) {
      console.warn('Admin email send failed for service verification', e.message);
    }

    return res.status(200).json({ success: true, verified: true, service: sanitize(row) });
  } catch (e) {
    console.error('verifyService error', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { verifyService };

async function getAllVerifications(req, res) {
  try {
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden: admin only' });
    }
    const rows = await listAll();
    return res.json({ items: rows.map(sanitize) });
  } catch (e) {
    console.error('getAllVerifications error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports.getAllVerifications = getAllVerifications;
