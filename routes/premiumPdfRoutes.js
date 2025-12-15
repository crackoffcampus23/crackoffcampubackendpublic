const express = require('express');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');
const { getS3, getBucket, getPublicUrl } = require('../utils/r2');
const { ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');

const router = express.Router();

const PREFIX = 'premiumpdf/';

// GET /getpremiumpdf - Public: list objects under premiumpdf/ with public URLs
router.get('/getpremiumpdf', async (req, res) => {
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
