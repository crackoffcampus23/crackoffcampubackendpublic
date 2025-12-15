const { PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, ListBucketsCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const crypto = require('crypto');
const { getS3, getBucket, getPublicUrl } = require('../utils/r2');

function randomKey(originalName) {
  const ext = path.extname(originalName || '').toLowerCase();
  const base = crypto.randomBytes(12).toString('hex');
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `uploads/${date}/${base}${ext}`;
}

async function uploadImage(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'file is required (multipart/form-data, field name: file)' });

    const s3 = getS3();
    const Bucket = getBucket();
    if (!Bucket) return res.status(500).json({ error: 'R2 bucket not configured. Set R2_BUCKET in .env' });

    const Key = randomKey(req.file.originalname);
    const Body = req.file.buffer;
    const ContentType = req.file.mimetype || 'application/octet-stream';

    await s3.send(new PutObjectCommand({ Bucket, Key, Body, ContentType }));

    const url = getPublicUrl(Key);
    return res.status(201).json({ key: Key, url, contentType: ContentType, size: req.file.size });
  } catch (e) {
    console.error('uploadImage error:', e);
    return res.status(500).json({ error: 'Upload failed' });
  }
}

async function deleteImage(req, res) {
  try {
    const { key } = req.params;
    if (!key) return res.status(400).json({ error: 'key param is required' });
    const s3 = getS3();
    const Bucket = getBucket();
    if (!Bucket) return res.status(500).json({ error: 'R2 bucket not configured. Set R2_BUCKET in .env' });

    await s3.send(new DeleteObjectCommand({ Bucket, Key: key }));
    return res.json({ success: true });
  } catch (e) {
    console.error('deleteImage error:', e);
    return res.status(500).json({ error: 'Delete failed' });
  }
}

module.exports = { uploadImage, deleteImage };

// --- Top Banner handlers ---

async function uploadTopBanners(req, res) {
  try {
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: 'files are required (multipart/form-data, field name: files[])' });

    const s3 = getS3();
    let Bucket = getBucket();
    if (!Bucket) {
      // attempt to derive a bucket by listing (requires permissions); else instruct to set env
      try {
        const { Buckets } = await s3.send(new ListBucketsCommand({}));
        if (Buckets && Buckets.length > 0) Bucket = Buckets[0].Name;
      } catch (_) {}
      if (!Bucket) return res.status(500).json({ error: 'R2 bucket not configured. Set R2_BUCKET in .env' });
    }

    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const results = [];
    for (const f of files) {
      const ext = path.extname(f.originalname || '').toLowerCase();
      const base = crypto.randomBytes(12).toString('hex');
      const Key = `topbanner/${date}/${base}${ext}`;
      await s3.send(new PutObjectCommand({ Bucket, Key, Body: f.buffer, ContentType: f.mimetype || 'application/octet-stream' }));
      results.push({ key: Key, url: getPublicUrl(Key), contentType: f.mimetype, size: f.size });
    }
    return res.status(201).json({ items: results });
  } catch (e) {
    console.error('uploadTopBanners error:', e);
    return res.status(500).json({ error: 'Upload failed' });
  }
}

async function deleteTopBanner(req, res) {
  try {
    const encoded = req.params.key;
    if (!encoded) return res.status(400).json({ error: 'key param is required' });
    const key = decodeURIComponent(encoded);
    if (!key.startsWith('topbanner/')) return res.status(400).json({ error: 'invalid key: must be in topbanner/ folder' });
    const s3 = getS3();
    let Bucket = getBucket();
    if (!Bucket) {
      try {
        const { Buckets } = await s3.send(new ListBucketsCommand({}));
        if (Buckets && Buckets.length > 0) Bucket = Buckets[0].Name;
      } catch (_) {}
      if (!Bucket) return res.status(500).json({ error: 'R2 bucket not configured. Set R2_BUCKET in .env' });
    }
    await s3.send(new DeleteObjectCommand({ Bucket, Key: key }));
    return res.json({ success: true });
  } catch (e) {
    console.error('deleteTopBanner error:', e);
    return res.status(500).json({ error: 'Delete failed' });
  }
}

async function getTopBanners(req, res) {
  try {
    const s3 = getS3();
    let Bucket = getBucket();
    if (!Bucket) {
      try {
        const { Buckets } = await s3.send(new ListBucketsCommand({}));
        if (Buckets && Buckets.length > 0) Bucket = Buckets[0].Name;
      } catch (_) {}
      if (!Bucket) return res.status(500).json({ error: 'R2 bucket not configured. Set R2_BUCKET in .env' });
    }

    const Prefix = 'topbanner/';
    const items = [];
    let ContinuationToken = undefined;
    do {
      const out = await s3.send(new ListObjectsV2Command({ Bucket, Prefix, ContinuationToken }));
      (out.Contents || []).forEach(obj => {
        if (obj.Key && !obj.Key.endsWith('/')) {
          items.push({ key: obj.Key, url: getPublicUrl(obj.Key), size: obj.Size, lastModified: obj.LastModified });
        }
      });
      ContinuationToken = out.IsTruncated ? out.NextContinuationToken : undefined;
    } while (ContinuationToken);

    return res.json({ items });
  } catch (e) {
    console.error('getTopBanners error:', e);
    return res.status(500).json({ error: e.message || 'Fetch failed' });
  }
}

module.exports.uploadTopBanners = uploadTopBanners;
module.exports.deleteTopBanner = deleteTopBanner;
module.exports.getTopBanners = getTopBanners;

// --- Generic multi-upload to a named folder (admin) ---

function normalizeFolderName(name) {
  const s = String(name || '').trim();
  if (!s) return '';
  // disallow path traversal and control chars; allow letters, numbers, -, _, and '/'
  const cleaned = s.replace(/[^A-Za-z0-9\/_-]+/g, '')
                   .replace(/^\/+|\/+$/g, '') // trim leading/trailing slashes
                   .replace(/\/{2,}/g, '/'); // collapse multiple consecutive slashes
  if (cleaned.includes('..')) return '';
  return cleaned;
}

async function uploadToFolder(req, res) {
  try {
    const folderNameRaw = req.body && (req.body.folderName || req.body.foldername || req.body.folder);
    const folder = normalizeFolderName(folderNameRaw);
    if (!folder) {
      return res.status(400).json({ error: 'folderName is required (alphanumeric, \'-\', \'_\', and \'/\' allowed)' });
    }

    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: 'files are required (multipart/form-data, field name: files[])' });

    const s3 = getS3();
    let Bucket = getBucket();
    if (!Bucket) {
      try {
        const { Buckets } = await s3.send(new ListBucketsCommand({}));
        if (Buckets && Buckets.length > 0) Bucket = Buckets[0].Name;
      } catch (_) {}
      if (!Bucket) return res.status(500).json({ error: 'R2 bucket not configured. Set R2_BUCKET in .env' });
    }

    // Ensure a folder marker exists (optional in S3/R2, but created for clarity)
    const folderMarkerKey = `${folder}/`;
    try {
      await s3.send(new PutObjectCommand({ Bucket, Key: folderMarkerKey, Body: Buffer.alloc(0), ContentType: 'application/x-directory' }));
    } catch (_) {
      // ignore marker creation errors (not strictly required)
    }

    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const uploads = files.map(async (f) => {
      const ext = path.extname(f.originalname || '').toLowerCase();
      const base = crypto.randomBytes(12).toString('hex');
      const Key = `${folder}/${date}/${base}${ext}`;
      await s3.send(new PutObjectCommand({ Bucket, Key, Body: f.buffer, ContentType: f.mimetype || 'application/octet-stream' }));
      return { key: Key, url: getPublicUrl(Key), contentType: f.mimetype, size: f.size };
    });

    const items = await Promise.all(uploads);
    return res.status(201).json({ items });
  } catch (e) {
    console.error('uploadToFolder error:', e);
    return res.status(500).json({ error: 'Upload failed' });
  }
}

module.exports.uploadToFolder = uploadToFolder;
