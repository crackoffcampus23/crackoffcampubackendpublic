const model = require('../models/successStoriesModel');

function sanitize(row) {
  if (!row) return null;
  return {
    reviewId: row.review_id,
    reviewerAvatar: row.reviewer_avatar,
    reviewerName: row.reviewer_name,
    reviewerRole: row.reviewer_role,
    reviewerCompany: row.reviewer_company,
    reviewerRating: row.reviewer_rating,
    reviewerReview: row.reviewer_review,
    reviewerPackage: row.reviewer_package,
    reviewerCity: row.reviewer_city,
    verifiedReview: row.verified_review,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Public list should hide role, company, rating, package, city
function sanitizePublic(row) {
  if (!row) return null;
  return {
    reviewId: row.review_id,
    reviewerAvatar: row.reviewer_avatar,
    reviewerName: row.reviewer_name,
    reviewerReview: row.reviewer_review,
    verifiedReview: row.verified_review,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function add(req, res) {
  try {
    const created = await model.create(req.body || {});
    return res.status(201).json({ item: sanitize(created) });
  } catch (e) {
    console.error('successStories.add error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getAll(req, res) {
  try {
    const rows = await model.listAll();
    return res.json({ items: rows.map(sanitizePublic) });
  } catch (e) {
    console.error('successStories.getAll error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteOne(req, res) {
  try {
    const { reviewid } = req.params;
    if (!reviewid) return res.status(400).json({ error: 'reviewid param is required' });
    const ok = await model.deleteById(reviewid);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    return res.json({ success: true });
  } catch (e) {
    console.error('successStories.deleteOne error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function edit(req, res) {
  try {
    const { reviewid } = req.params;
    if (!reviewid) return res.status(400).json({ error: 'reviewid param is required' });
    const patch = req.body || {};
    const updated = await model.updateById(reviewid, patch);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    return res.json({ item: sanitize(updated) });
  } catch (e) {
    console.error('successStories.edit error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { add, getAll, deleteOne, edit };
