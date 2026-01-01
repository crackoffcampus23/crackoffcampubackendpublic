const { pool } = require('../utils/db');


async function verifySlot(req, res) {
  try {
    const body = req.body || {};
    const slotDate = body.slotDate || body.date || body.Date || null;
    const slotTime = body.slotTime || body.time || body.Time || null;
    const serviceNeeded =
      body.serviceNeeded ||
      body.serviceTitle ||
      body.slotName ||
      body.service ||
      null;

    if (!slotDate || !slotTime || !serviceNeeded) {
      return res.status(400).json({
        error:
          'slotDate, slotTime and serviceNeeded/serviceTitle/slotName are required',
      });
    }

    const { rows } = await pool.query(
      `SELECT 1
       FROM service_verifications
       WHERE slot_date = $1
         AND slot_time = $2
         AND service_needed = $3
       LIMIT 1`,
      [slotDate, slotTime, serviceNeeded]
    );

    const conflict = rows.length > 0;
    return res.json({ available: conflict ? 0 : 1 });
  } catch (e) {
    console.error('verifySlot error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { verifySlot };
