const express = require('express');
const { getS3, getBucket, getPublicUrl } = require('../utils/r2');
const { ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const router = express.Router();

// Public route: list all images under imageGallery/ prefix in R2
router.get('/image-gallery', async (req, res) => {
  try {
    const s3 = getS3();
    const bucket = getBucket();
    if (!s3 || !bucket) {
      return res.status(500).json({ error: 'R2 not configured' });
    }

    const prefix = 'imageGallery/';
    const params = {
      Bucket: bucket,
      Prefix: prefix,
    };

    const out = await s3.send(new ListObjectsV2Command(params));
    const items = (out.Contents || [])
      .filter((obj) => obj.Key && obj.Key !== prefix)
      .map((obj) => ({
        key: obj.Key,
        url: getPublicUrl(obj.Key),
        size: obj.Size,
        lastModified: obj.LastModified,
      }));

    return res.json({ items });
  } catch (e) {
    console.error('GET /image-gallery error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Public delete route: delete a single image under imageGallery/ by key
// Example: DELETE /image-gallery/imageGallery%2F20251127%2Fabc.png
router.delete('/image-gallery/:key', async (req, res) => {
  try {
    const s3 = getS3();
    const bucket = getBucket();
    if (!s3 || !bucket) {
      return res.status(500).json({ error: 'R2 not configured' });
    }

    const rawKey = req.params.key;
    if (!rawKey) {
      return res.status(400).json({ error: 'key is required' });
    }

    // Decode URL-encoded key
    const decodedKey = decodeURIComponent(rawKey);
    if (!decodedKey.startsWith('imageGallery/')) {
      return res.status(400).json({ error: 'Only keys under imageGallery/ can be deleted' });
    }

    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: decodedKey }));
    return res.json({ success: true });
  } catch (e) {
    console.error('DELETE /image-gallery/:key error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
