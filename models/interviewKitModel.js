const { pool } = require('../utils/db');
const { generateId } = require('../utils/idGenerator');

const table = 'interview_preperation_kit';

function normalizeCreateInput(data) {
  const d = data || {};
  return {
    kitType: d.kitType ?? d.KitType ?? null,
    kitName: d.kitName ?? d.KitName ?? null,
    kitDescription: d.kitDescription ?? d.KitDescription ?? null,
    kitBannerImageUrl: d.kitBannerImageUrl ?? d.KitBannerImageUrl ?? null,
    kitSkills: d.kitSkills ?? d.KitSkills ?? null,
    kitUrl: d.kitUrl ?? d.KitUrl ?? null,
    actualPrice: d.actualPrice ?? d.ActualPrice ?? null,
    discountedPrice: d.discountedPrice ?? d.DiscountedPrice ?? null,
    published: typeof d.published === 'boolean' ? d.published : (d.published === 'true' ? true : (d.published === 'false' ? false : null)),
  };
}

function normalizeUpdateInput(data) {
  const d = data || {};
  const out = {};
  const copyIfPresent = (targetKey, ...sourceKeys) => {
    for (const sk of sourceKeys) {
      if (Object.prototype.hasOwnProperty.call(d, sk)) {
        out[targetKey] = d[sk];
        return;
      }
    }
  };
  copyIfPresent('kitType', 'kitType', 'KitType');
  copyIfPresent('kitName', 'kitName', 'KitName');
  copyIfPresent('kitDescription', 'kitDescription', 'KitDescription');
  copyIfPresent('kitBannerImageUrl', 'kitBannerImageUrl', 'KitBannerImageUrl');
  copyIfPresent('kitSkills', 'kitSkills', 'KitSkills');
  copyIfPresent('kitUrl', 'kitUrl', 'KitUrl');
  copyIfPresent('actualPrice', 'actualPrice', 'ActualPrice');
  copyIfPresent('discountedPrice', 'discountedPrice', 'DiscountedPrice');
  // published: support boolean or string inputs, only if present
  if (Object.prototype.hasOwnProperty.call(d, 'published')) {
    out.published = typeof d.published === 'boolean'
      ? d.published
      : (d.published === 'true' ? true : (d.published === 'false' ? false : d.published));
  }
  return out;
}

async function create(data) {
  const kit_id = generateId(7);
  const n = normalizeCreateInput(data);
  const { rows } = await pool.query(
    `INSERT INTO ${table} (
      kit_id, kit_type, kit_name, kit_description, kit_banner_image_url, kit_skills, kit_url, actual_price, discounted_price, published
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10,false)) RETURNING *`,
    [kit_id, n.kitType, n.kitName, n.kitDescription, n.kitBannerImageUrl, n.kitSkills, n.kitUrl, n.actualPrice, n.discountedPrice, n.published]
  );
  return rows[0];
}

async function listAll() {
  const { rows } = await pool.query(`SELECT * FROM ${table} ORDER BY created_at DESC`);
  return rows;
}

async function listPublic() {
  const { rows } = await pool.query(`SELECT * FROM ${table} WHERE published = true ORDER BY created_at DESC`);
  return rows;
}

async function getById(id) {
  const { rows } = await pool.query(`SELECT * FROM ${table} WHERE kit_id = $1`, [id]);
  return rows[0] || null;
}

async function deleteById(id) {
  const result = await pool.query(`DELETE FROM ${table} WHERE kit_id = $1`, [id]);
  return result.rowCount > 0;
}

async function updateById(id, patch) {
  const n = normalizeUpdateInput(patch);
  const mapping = {
    kitType: 'kit_type',
    kitName: 'kit_name',
    kitDescription: 'kit_description',
    kitBannerImageUrl: 'kit_banner_image_url',
    kitSkills: 'kit_skills',
    kitUrl: 'kit_url',
    actualPrice: 'actual_price',
    discountedPrice: 'discounted_price',
    published: 'published',
  };
  const fields = [];
  const values = [];
  let i = 1;
  for (const k of Object.keys(mapping)) {
    if (Object.prototype.hasOwnProperty.call(n, k) && n[k] !== undefined) {
      fields.push(`${mapping[k]} = $${i++}`);
      values.push(n[k]);
    }
  }
  if (!fields.length) {
    const { rows } = await pool.query(`SELECT * FROM ${table} WHERE kit_id = $1`, [id]);
    return rows[0] || null;
  }
  values.push(id);
  const sql = `UPDATE ${table} SET ${fields.join(', ')}, updated_at = now() WHERE kit_id = $${i} RETURNING *`;
  const { rows } = await pool.query(sql, values);
  return rows[0] || null;
}

module.exports = { create, listAll, listPublic, getById, deleteById, updateById };
