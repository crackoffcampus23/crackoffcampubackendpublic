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

function getWhatsappFrom() {
  const raw = getEnv('TWILIO_WHATSAPP_FROM') || 'whatsapp:+15558343496';
  const withPlus = raw.startsWith('+') ? raw : `+${raw}`;
  return raw.startsWith('whatsapp:') ? raw : `whatsapp:${withPlus}`;
}

function formatTwilioError(err) {
  const msg = err && err.message ? err.message : String(err);
  // Twilio 401 unauthorized / 20003 error code often has message "Authenticate"
  if ((err && (err.status === 401 || err.code === 20003)) || /Authenticate/i.test(msg)) {
    return 'Authenticate: verify TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN and WhatsApp sender configuration';
  }
  return msg;
}

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
  // Only use Twilio WhatsApp for sending. Do not fallback to email.
  if (!client) {
    return { success: false, via: null, error: 'Twilio client not configured (missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN)' };
  }
  if (!toPhone) {
    return { success: false, via: null, error: 'Missing recipient phone number' };
  }
  try {
    const toNumber = toPhone.startsWith('+') ? toPhone : `+${toPhone}`;
    const msg = await client.messages.create({
      from: getWhatsappFrom(),
      to: `whatsapp:${toNumber}`,
      body: text,
    });
    return { success: true, via: 'whatsapp', sid: msg.sid };
  } catch (err) {
    const emsg = formatTwilioError(err);
    console.error('Twilio send error:', emsg);
    return {
      success: false,
      via: 'whatsapp',
      error: emsg,
      details: {
        code: err && err.code ? err.code : null,
        status: err && err.status ? err.status : null,
        moreInfo: err && err.moreInfo ? err.moreInfo : null,
      }
    };
  }
}

async function alertUser(req, res) {
  try {
    const client = buildTwilioClient();
    const items = await fetchActivePlans();
    let alertsSent = 0;
    const expiringUsers = [];

    for (const r of items) {
      const start = r.created_at ? new Date(r.created_at) : null;
      const plan = r.plan_type || r.current_plan;
      if (!start || !plan) continue;
      const expiry = addMonths(start, 3);
      const planName = planDisplayName(plan);

      // compute human-readable time left for every user
      const now = new Date();
      const msLeft = expiry.getTime() - now.getTime();
      const formatTimeLeft = (ms) => {
        if (ms <= 0) return 'expired';
        const days = Math.floor(ms / (24 * 60 * 60 * 1000));
        const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const mins = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
        const parts = [];
        if (days) parts.push(`${days} day${days > 1 ? 's' : ''}`);
        if (hours) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
        if (!days && mins) parts.push(`${mins} minute${mins > 1 ? 's' : ''}`);
        return parts.join(' ') || 'less than a minute';
      };

      const userObj = {
        userId: r.user_id,
        fullName: r.full_name || null,
        plan: planName,
        expiresAt: expiry.toISOString(),
        timeLeftMs: msLeft,
        timeLeft: formatTimeLeft(msLeft),
        alertSent: false,
        alertVia: null,
      };

      // Only send alerts if expiring today or tomorrow
      if (isOneDayBefore(expiry) || isToday(expiry)) {
        const text = isOneDayBefore(expiry)
          ? `Hi ${r.full_name || 'User'},\n\nYour ${planName} is gonna expire tomorrow. Please renew your subscription at Crack Off-Campus.\n\nRegards,\n\nTeam Crack Off-Campus`
          : `Hi ${r.full_name || 'User'},\n\nYour ${planName} is gonna expire today. Please renew your subscription at Crack Off-Campus.\n\nRegards,\n\nTeam Crack Off-Campus`;

        const subject = `Your ${planName} plan is expiring`;
        const toPhone = r.phone_number || null;
        const toEmail = r.user_email || null;
        const result = await sendWhatsappOrEmail({ client, toPhone, toEmail, subject, text });
        if (result.success) alertsSent++;
        userObj.alertSent = !!result.success;
        userObj.alertVia = result.via || null;
      }

      expiringUsers.push(userObj);
    }

    return res.json({ success: true, alertsSent, expiringUsers });
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

async function testWhatsapp(req, res) {
  try {
    const client = buildTwilioClient();
    if (!client) return res.status(500).json({ success: false, error: 'Twilio client not configured' });

    const body = req.body || {};
    const toPhone = body.toPhone || body.to || req.query.toPhone || req.query.to;
    const text = body.text || req.query.text;

    if (!toPhone) return res.status(400).json({ success: false, error: 'toPhone is required (e.g. { toPhone: "+9199...", text: "message" })' });
    if (!text) return res.status(400).json({ success: false, error: 'text is required' });

    const toNumber = toPhone.startsWith('+') ? toPhone : `+${toPhone}`;
    const msg = await client.messages.create({
      from: getWhatsappFrom(),
      to: `whatsapp:${toNumber}`,
      body: text,
    });

    return res.json({ success: true, sid: msg.sid, via: 'whatsapp' });
  } catch (e) {
    const emsg = formatTwilioError(e);
    console.error('cron.testWhatsapp error', emsg);
    return res.status(500).json({ success: false, error: emsg });
  }
}

async function messageStatus(req, res) {
  try {
    const client = buildTwilioClient();
    if (!client) return res.status(500).json({ success: false, error: 'Twilio client not configured' });

    const sid = (req.query.sid || (req.body && req.body.sid) || '').trim();
    if (!sid) return res.status(400).json({ success: false, error: 'sid is required' });

    const msg = await client.messages(sid).fetch();
    // Return key delivery fields
    return res.json({
      success: true,
      sid: msg.sid,
      status: msg.status,
      to: msg.to,
      from: msg.from,
      errorCode: msg.errorCode || null,
      numMedia: msg.numMedia,
      dateCreated: msg.dateCreated,
      dateUpdated: msg.dateUpdated,
    });
  } catch (e) {
    const emsg = formatTwilioError(e);
    console.error('cron.messageStatus error', emsg);
    return res.status(500).json({ success: false, error: emsg });
  }
}

async function sendWhatsappTemplate(req, res) {
  try {
    const client = buildTwilioClient();
    if (!client) return res.status(500).json({ success: false, error: 'Twilio client not configured' });

    const body = req.body || {};
    const toPhone = body.toPhone || body.to || req.query.toPhone || req.query.to;
    const contentSid = body.contentSid || req.query.contentSid;
    const variables = body.variables || body.contentVariables || req.query.variables;

    if (!toPhone) return res.status(400).json({ success: false, error: 'toPhone is required' });
    if (!contentSid) return res.status(400).json({ success: false, error: 'contentSid is required (Twilio Content template SID)' });

    const toNumber = toPhone.startsWith('+') ? toPhone : `+${toPhone}`;
    // Twilio Content API expects contentVariables as a JSON string
    let contentVariables;
    if (typeof variables === 'string') {
      // If string, validate it is JSON; otherwise wrap as empty
      try {
        JSON.parse(variables);
        contentVariables = variables;
      } catch (_) {
        contentVariables = JSON.stringify({});
      }
    } else if (variables && typeof variables === 'object') {
      contentVariables = JSON.stringify(variables);
    } else {
      contentVariables = JSON.stringify({});
    }

    const msg = await client.messages.create({
      from: getWhatsappFrom(),
      to: `whatsapp:${toNumber}`,
      contentSid,
      contentVariables,
    });

    return res.json({ success: true, sid: msg.sid, via: 'whatsapp', usingTemplate: true });
  } catch (e) {
    const emsg = formatTwilioError(e);
    console.error('cron.sendWhatsappTemplate error', emsg);
    return res.status(500).json({
      success: false,
      error: emsg,
      details: {
        code: e && e.code ? e.code : null,
        status: e && e.status ? e.status : null,
        moreInfo: e && e.moreInfo ? e.moreInfo : null,
      }
    });
  }
}

module.exports = { alertUser, endUser, testWhatsapp, messageStatus, sendWhatsappTemplate };
