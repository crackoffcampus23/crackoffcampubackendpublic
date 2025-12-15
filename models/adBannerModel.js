const { pool } = require('../utils/db');

const table = 'adbanner';

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${table} (
      id BOOLEAN PRIMARY KEY DEFAULT true,
      app_url TEXT,
      published BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    )
  `);
  // Ensure single row exists
  await pool.query(`INSERT INTO ${table} (id) VALUES (true) ON CONFLICT (id) DO NOTHING`);
}

async function upsert(appUrl, published) {
  await ensureTable();
  const { rows } = await pool.query(
    `UPDATE ${table} SET app_url=$1, published=COALESCE($2, published), updated_at=now() WHERE id=true RETURNING *`,
    [appUrl ?? null, typeof published === 'boolean' ? published : null]
  );
  return rows[0] || null;
}

async function get() {
  await ensureTable();
  const { rows } = await pool.query(`SELECT * FROM ${table} WHERE id=true`);
  return rows[0] || null;
}

async function updatePartial(patch) {
  await ensureTable();
  const fields = [];
  const values = [];
  let i = 1;
  if (Object.prototype.hasOwnProperty.call(patch, 'appUrl')) {
    fields.push(`app_url=$${i++}`); values.push(patch.appUrl ?? null);
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'published')) {
    const val = typeof patch.published === 'boolean' ? patch.published : (patch.published === 'true' ? true : (patch.published === 'false' ? false : null));
    fields.push(`published=$${i++}`); values.push(val);
  }
  if (!fields.length) return get();
  const sql = `UPDATE ${table} SET ${fields.join(', ')}, updated_at=now() WHERE id=true RETURNING *`;
  const { rows } = await pool.query(sql, values);
  return rows[0] || null;
}

async function reset() {
  await ensureTable();
  const { rows } = await pool.query(`UPDATE ${table} SET app_url=NULL, published=false, updated_at=now() WHERE id=true RETURNING *`);
  return rows[0] || null;
}

module.exports = { ensureTable, upsert, get, updatePartial, reset };