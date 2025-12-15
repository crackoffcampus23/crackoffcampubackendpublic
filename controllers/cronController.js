const { pool } = require('../utils/db');
const { sendEmail } = require('../utils/emailService');

function getEnv(name) {
  return process.env[name];
}

function buildTwilioClient() {
  const accountSid = getEnv('TWILIO_ACCOUNT_SID');
  const authToken = getEnv('TWILIO_AUTH_TOKEN');
  if (!accountSid || !authToken) return null;
  try {
    // Lazy require to avoid hard dependency if not configured
    // eslint-disable-next-line global-require
    const client = require('twilio')(accountSid, authToken);
    return client;
  } catch (_) {
    return null;
  }
}

const TWILIO_WHATSAPP_FROM = 'whatsapp:+14155238886';

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function isOneDayBefore(expiry) {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const exp = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
  return exp.getTime() === tomorrow.getTime();
}

function isToday(expiry) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const exp = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
  return exp.getTime() === today.getTime();
}

function planDisplayName(plan) {
  switch (String(plan || '').toLowerCase()) {
    case 'basic': return 'Basic';
    case 'standard': return 'Standard';
    case 'booster': return 'Booster';
    case 'premiumjobs': return 'Premium Jobs';
    default: return plan || 'Unknown';
  }
}

async function fetchActivePlans() {
  // Get latest subscription payment per user where verified=true and plan_type is set
  const sql = `
    SELECT DISTINCT ON (p.user_id)
      p.user_id,
      p.plan_type,
      p.created_at,
      u.email AS user_email,
      ud.user_type,
      ud.plan_type AS current_plan,
      ud.user_description,
      ud.education,
      ud.experience,
      ud.updated_at,
      u.full_name,
      u.phone_number
    FROM payments p
    JOIN users u ON u.user_id = p.user_id
    LEFT JOIN user_details ud ON ud.user_id = p.user_id
    WHERE p.verified = true AND p.plan_type IS NOT NULL
    ORDER BY p.user_id, p.created_at DESC;
  `;
  const { rows } = await pool.query(sql);
  return rows;
}

async function sendWhatsappOrEmail({ client, toPhone, toEmail, subject, text }) {
  // Prefer WhatsApp if phone present and Twilio configured
  if (client && toPhone) {
    try {
      const msg = await client.messages.create({
        from: TWILIO_WHATSAPP_FROM,
        to: `whatsapp:${toPhone.startsWith('+') ? toPhone : `+${toPhone}`}`,
        body: text,
      });
      return { success: true, via: 'whatsapp', sid: msg.sid };
    } catch (err) {
      // Fallback to email
    }
  }
  if (toEmail) {
    const result = await sendEmail({ to: toEmail, subject, text });
    return { success: !!result.success, via: 'email' };
  }
  return { success: false };
}

async function alertUser(req, res) {
  try {
    const client = buildTwilioClient();
    const items = await fetchActivePlans();
    let alertsSent = 0;

    for (const r of items) {
      const start = r.created_at ? new Date(r.created_at) : null;
      const plan = r.plan_type || r.current_plan;
      if (!start || !plan) continue;
      const expiry = addMonths(start, 3);
      const planName = planDisplayName(plan);

      let text;
      if (isOneDayBefore(expiry)) {
        text = `Hi ${r.full_name || 'User'},\n\nYour ${planName} is gonna expire tomorrow. Please renew your subscription at Crack Off-Campus.\n\nRegards,\nTeam Crack Off-Campus`;
      } else if (isToday(expiry)) {
        text = `Hi ${r.full_name || 'User'},\n\nYour ${planName} is gonna expire today. Please renew your subscription at Crack Off-Campus.\n\nRegards,\nTeam Crack Off-Campus`;
      } else {
        continue;
      }

      const subject = `Your ${planName} plan is expiring`;
      const toPhone = r.phone_number || null;
      const toEmail = r.user_email || null;
      const result = await sendWhatsappOrEmail({ client, toPhone, toEmail, subject, text });
      if (result.success) alertsSent++;
    }

    return res.json({ success: true, alertsSent });
  } catch (e) {
    console.error('cron.alertUser error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function endUser(req, res) {
  try {
    // Expire plans older than 3 months: set user_details.user_type and plan_type to 'free'
    const sql = `
      WITH latest AS (
        SELECT DISTINCT ON (user_id) user_id, plan_type, created_at
        FROM payments
        WHERE verified = true AND plan_type IS NOT NULL
        ORDER BY user_id, created_at DESC
      )
      UPDATE user_details ud
      SET user_type = 'free', plan_type = 'free', updated_at = now()
      FROM latest l
      WHERE ud.user_id = l.user_id
        AND (l.created_at + INTERVAL '3 months') < now()
      RETURNING ud.user_id;
    `;
    const { rows } = await pool.query(sql);
    return res.json({ success: true, expiredUsers: rows.map(r => r.user_id) });
  } catch (e) {
    console.error('cron.endUser error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { alertUser, endUser };
