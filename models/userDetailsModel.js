const { pool } = require('../utils/db');

async function ensureDefaultRow(userId) {
  await pool.query(
    `INSERT INTO user_details (user_id, user_type)
     VALUES ($1, 'free')
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
}

async function getByUserId(userId) {
  const { rows } = await pool.query('SELECT * FROM user_details WHERE user_id=$1', [userId]);
  return rows[0] || null;
}

async function listAll() {
  const { rows } = await pool.query('SELECT * FROM user_details ORDER BY created_at DESC');
  return rows;
}

async function updateByUserId(userId, payload) {
  // Build dynamic update
  const fields = [];
  const values = [];
  let idx = 1;

  // userType deliberately excluded from updates (immutable after creation).
  const mapping = {
    // userType: 'user_type', // immutable
    userProfileBg: 'user_profile_bg',
    userPfp: 'user_pfp',
    userDescription: 'user_description',
    skillAndExpertise: 'skill_and_expertise',
    experience: 'experience',
    education: 'education'
  };

  for (const key of Object.keys(mapping)) {
    if (payload[key] !== undefined) {
      fields.push(`${mapping[key]}=$${idx++}`);
      // JSONB fields: experience, education — stringify if needed
      if (key === 'experience' || key === 'education') {
        const val = typeof payload[key] === 'string' ? payload[key] : JSON.stringify(payload[key]);
        values.push(val);
      } else {
        values.push(payload[key]);
      }
    }
  }
  if (fields.length === 0) return getByUserId(userId);

  values.push(userId);
  const sql = `UPDATE user_details SET ${fields.join(', ')}, updated_at=now() WHERE user_id=$${idx} RETURNING *`;
  const { rows } = await pool.query(sql, values);
  return rows[0] || null;
}

async function setPlanType(userId, planType) {
  // Also mirror plan_type into user_type as requested.
  const { rows } = await pool.query(
    'UPDATE user_details SET plan_type=$1, user_type=$1, updated_at=now() WHERE user_id=$2 RETURNING *',
    [planType, userId]
  );
  return rows[0] || null;
}

async function setUserType(userId, userType) {
  // Mirror user_type into plan_type as requested
  const { rows } = await pool.query(
    'UPDATE user_details SET user_type=$1, plan_type=$1, updated_at=now() WHERE user_id=$2 RETURNING *',
    [userType, userId]
  );
  return rows[0] || null;
}

module.exports = { ensureDefaultRow, getByUserId, updateByUserId, listAll, setPlanType, setUserType };
