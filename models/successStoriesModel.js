const { pool } = require('../utils/db');
const { generateId } = require('../utils/idGenerator');

const table = 'success_stories';

async function create(data) {
  const review_id = generateId(6);
  const {
    reviewerAvatar = null,
    reviewerName = null,
    reviewerRole = null,
    reviewerCompany = null,
    reviewerRating = null,
    reviewerReview = null,
    reviewerPackage = null,
    reviewerCity = null,
    verifiedReview = false,
  } = data || {};

  const { rows } = await pool.query(
    `INSERT INTO ${table} (
      review_id, reviewer_avatar, reviewer_name, reviewer_role, reviewer_company,
      reviewer_rating, reviewer_review, reviewer_package, reviewer_city, verified_review
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *`,
    [
      review_id,
      reviewerAvatar,
      reviewerName,
      reviewerRole,
      reviewerCompany,
      reviewerRating,
      reviewerReview,
      reviewerPackage,
      reviewerCity,
      verifiedReview,
    ]
  );
  return rows[0];
}

async function listAll() {
  const { rows } = await pool.query(`SELECT * FROM ${table} ORDER BY created_at DESC`);
  return rows;
}

async function deleteById(id) {
  const result = await pool.query(`DELETE FROM ${table} WHERE review_id = $1`, [id]);
  return result.rowCount > 0;
}

async function updateById(id, patch) {
  const fields = [];
  const values = [];
  let idx = 1;

  const mapping = {
    reviewerAvatar: 'reviewer_avatar',
    reviewerName: 'reviewer_name',
    reviewerRole: 'reviewer_role',
    reviewerCompany: 'reviewer_company',
    reviewerRating: 'reviewer_rating',
    reviewerReview: 'reviewer_review',
    reviewerPackage: 'reviewer_package',
    reviewerCity: 'reviewer_city',
    verifiedReview: 'verified_review',
  };

  Object.keys(mapping).forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      fields.push(`${mapping[k]} = $${++idx}`);
      values.push(patch[k]);
    }
  });

  if (fields.length === 0) {
    const { rows } = await pool.query(`SELECT * FROM ${table} WHERE review_id = $1`, [id]);
    return rows[0] || null;
  }

  const sql = `UPDATE ${table} SET ${fields.join(', ')}, updated_at = now() WHERE review_id = $1 RETURNING *`;
  const { rows } = await pool.query(sql, [id, ...values]);
  return rows[0] || null;
}

module.exports = { create, listAll, deleteById, updateById };
