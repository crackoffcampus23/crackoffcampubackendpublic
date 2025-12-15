const { pool } = require('../utils/db');

// POST /serviceverifier (public)
// Body: { "slotDate": "YYYY-MM-DD", "slotTime": "9:00 PM" }
// Response: { "available": 1 } if no conflict, { "available": 0 } if conflict.
async function verifySlot(req, res) {
  try {
    const body = req.body || {};
    const slotDate = body.slotDate || body.date || body.Date || null;
    const slotTime = body.slotTime || body.time || body.Time || null;

    if (!slotDate || !slotTime) {
      return res.status(400).json({ error: 'slotDate and slotTime are required' });
    }

    const { rows } = await pool.query(
      `SELECT 1 FROM service_verifications WHERE slot_date = $1 AND slot_time = $2 LIMIT 1`,
      [slotDate, slotTime]
    );

    const conflict = rows.length > 0;
    return res.json({ available: conflict ? 0 : 1 });
  } catch (e) {
    console.error('verifySlot error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { verifySlot };
