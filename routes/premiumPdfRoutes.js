const express = require('express');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');
const { getS3, getBucket, getPublicUrl } = require('../utils/r2');
const { ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const { ensureDefaultRow, getByUserId } = require('../models/userDetailsModel');

const router = express.Router();

const PREFIX = 'premiumpdf/';

// Allowed user types for accessing premium PDF
const PREMIUM_ACCESS_TYPES = [
  'basic',
  'standard',
  'booster',
  'premiumjobs',
  'jobs',
  'jobspremium',
];
router.get('/admingetpremiumpdf', async (req, res) => {
  try {
    const s3 = getS3();
    const bucket = getBucket();
    if (!s3 || !bucket) {
      return res.status(500).json({ error: 'R2 not configured' });
    }

    const out = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: PREFIX }));
    const contents = out.Contents || [];
    const items = contents
      .filter(obj => obj.Key && obj.Key !== PREFIX)
      .map(obj => ({
        key: obj.Key,
        url: getPublicUrl(obj.Key),
        size: obj.Size,
        lastModified: obj.LastModified,
      }));

    return res.json({ items });
  } catch (e) {
    console.error('GET /getpremiumpdf error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /getpremiumpdf - gated by userType: returns 0 for free users, items payload for premium users
router.get('/getpremiumpdf', async (req, res) => {
  try {
    const userId = req.query.userId || (req.body && req.body.userId);

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Ensure user_details row exists and fetch user type
    await ensureDefaultRow(userId);
    const details = await getByUserId(userId);
    const userType = (details && details.user_type ? String(details.user_type) : 'free').toLowerCase();

    if (!PREMIUM_ACCESS_TYPES.includes(userType)) {
      // Explicitly block free or unknown types with a simple numeric 0 payload
      return res.json(0);
    }

    const s3 = getS3();
    const bucket = getBucket();
    if (!s3 || !bucket) {
      return res.status(500).json({ error: 'R2 not configured' });
    }

    const out = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: PREFIX }));
    const contents = out.Contents || [];
    const items = contents
      .filter(obj => obj.Key && obj.Key !== PREFIX)
      .map(obj => ({
        key: obj.Key,
        url: getPublicUrl(obj.Key),
        size: obj.Size,
        lastModified: obj.LastModified,
      }));

    return res.json({ items });
  } catch (e) {
    console.error('GET /getpremiumpdf error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /premiumpdf - Admin: bulk delete all objects under premiumpdf/
router.delete('/premiumpdf', auth, requireAdmin, async (req, res) => {
  try {
    const s3 = getS3();
    const bucket = getBucket();
    if (!s3 || !bucket) {
      return res.status(500).json({ error: 'R2 not configured' });
    }

    // List keys under prefix
    const out = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: PREFIX }));
    const keys = (out.Contents || [])
      .filter(obj => obj.Key && obj.Key !== PREFIX)
      .map(obj => ({ Key: obj.Key }));

    if (keys.length === 0) {
      return res.json({ success: true, deleted: 0 });
    }

    // Bulk delete
    const delOut = await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys } }));
    const deleted = (delOut.Deleted || []).length;
    const errors = (delOut.Errors || []).map(err => ({ key: err.Key, code: err.Code, message: err.Message }));

    return res.json({ success: errors.length === 0, deleted, errors });
  } catch (e) {
    console.error('DELETE /premiumpdf error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
