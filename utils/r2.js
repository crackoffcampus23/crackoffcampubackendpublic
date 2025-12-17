// Cloudflare R2 (S3-compatible) client setup
const { S3Client, HeadBucketCommand, ListBucketsCommand } = require('@aws-sdk/client-s3');
const https = require('https');

let s3; // lazily initialized

function getEnv(name, fallback) {
  return process.env[name] || fallback;
}

function buildEndpoint() {
  const explicit = getEnv('R2_ENDPOINT');
  if (explicit) return explicit;
  const accountId = getEnv('R2_ACCOUNT_ID');
  if (accountId) return `https://${accountId}.r2.cloudflarestorage.com`;
  return null;
}

// Try to discover the Account ID using a Cloudflare API Token (R2_API_TOKEN)
function fetchAccountIdFromToken(token) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      'https://api.cloudflare.com/client/v4/accounts',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'crackoffcampusserver/1.0'
        }
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data || '{}');
            if (json.success && Array.isArray(json.result) && json.result.length > 0) {
              resolve(json.result[0].id);
            } else {
              reject(new Error('Unable to derive account id from token'));
            }
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

// Ensure we have an endpoint configured; if missing and we have a token, try auto-discovery
async function ensureEndpoint() {
  let endpoint = buildEndpoint();
  if (endpoint) return endpoint;
  const apiToken = getEnv('R2_API_TOKEN');
  if (!apiToken) return null;
  try {
    const discoveredAccountId = await fetchAccountIdFromToken(apiToken);
    if (discoveredAccountId) {
      // Cache it for subsequent runs
      process.env.R2_ACCOUNT_ID = discoveredAccountId;
      endpoint = `https://${discoveredAccountId}.r2.cloudflarestorage.com`;
      return endpoint;
    }
    return null;
  } catch (_) {
    return null;
  }
}

function createClient() {
  const accessKeyId = getEnv('R2_ACCESS_KEY_ID');
  const secretAccessKey = getEnv('R2_SECRET_ACCESS_KEY');
  let endpoint = buildEndpoint();
  const region = getEnv('R2_REGION', 'auto');

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('R2 credentials missing. Please set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY in .env');
  }
  if (!endpoint) {
    throw new Error('R2 endpoint not configured. Set R2_ENDPOINT or R2_ACCOUNT_ID (or R2_API_TOKEN) in .env');
  }

  // normalize endpoint: strip trailing slashes and accidental bucket suffix if present
  endpoint = String(endpoint).replace(/\/$/, '');
  const bucket = getEnv('R2_BUCKET');
  if (bucket && endpoint.endsWith(`/${bucket}`)) {
    endpoint = endpoint.slice(0, -(bucket.length + 1));
  }

  return new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    // Cloudflare R2 expects path-style requests with endpoint = https://<accountId>.r2.cloudflarestorage.com
    forcePathStyle: true,
  });
}

async function initR2() {
  try {
    // Try to ensure endpoint availability (auto-derive using API token if needed)
    let endpoint = buildEndpoint();
    if (!endpoint) {
      endpoint = await ensureEndpoint();
    }
    s3 = createClient();
    const bucket = getEnv('R2_BUCKET');
    // Try a lightweight check if possible
    if (bucket) {
      try {
        await s3.send(new HeadBucketCommand({ Bucket: bucket }));
        console.log(`Cloudflare R2: Connected. Bucket '${bucket}' is accessible`);
      } catch (e) {
        console.warn(`Cloudflare R2: Client created, but could not verify bucket '${bucket}':`, e.name || e.code || e.message);
      }
    } else {
      // Fallback: attempt ListBuckets (may require permissions)
      try {
        await s3.send(new ListBucketsCommand({}));
        console.log('Cloudflare R2: Connected (ListBuckets ok)');
      } catch (_) {
        console.log('Cloudflare R2: Client configured successfully');
      }
    }
    return s3;
  } catch (err) {
    console.warn('Cloudflare R2: Not configured -', err.message);
    return null;
  }
}

function getS3() {
  if (!s3) s3 = createClient();
  return s3;
}
function getBucket() {
  return getEnv('R2_BUCKET');
}

function getPublicBaseUrl() {
  const base = getEnv('R2_PUBLIC_BASE_URL');
  if (base) return base.replace(/\/$/, '');
  const accountId = getEnv('R2_ACCOUNT_ID');
  const bucket = getEnv('R2_BUCKET');
  if (accountId && bucket) return `https://${accountId}.r2.cloudflarestorage.com/${bucket}`;
  return null;
}

function getPublicUrl(key) {
  const base = getPublicBaseUrl();
  if (!base) return null;
  const safeKey = String(key).replace(/^\//, '');
  return `${base}/${safeKey}`;
}

module.exports = { initR2, getS3, getBucket, getPublicUrl };
