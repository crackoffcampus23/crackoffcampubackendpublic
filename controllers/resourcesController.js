const resources = require('../models/resourcesModel');
const { makeController } = require('./crudFactory');
const { upsertForUserResource, getForUser } = require('../models/userResourcesModel');
const { ensureDefaultRow, getByUserId } = require('../models/userDetailsModel');
const crypto = require('crypto');

const mapping = {
  resourceId: 'resource_id',
  resourceName: 'resource_name',
  shortDescription: 'short_description',
  whatYouGet: 'what_you_get',
  downloadLink: 'download_link',
  resourceFee: 'resource_fee',
  totalDownloads: 'total_downloads',
  published: 'published',
  imageBannerLink
: 'banner_image'
};

const base = makeController(resources, 'resourceid', mapping);

const BASIC_FREE_RESOURCE_IDS = new Set([
  'yj2WDQTEdeRM', // Cover Letter Template
  'YJV8ayf93skB', // Cold Email Template
  'htQseLUy5Ydi' // Referral Template
]);

const STANDARD_BOOSTER_EXTRA_RESOURCE_IDS = new Set([
  'xxorRYrbG3qG', // ATS-Friendly Resume Template
  'egEoxDPmHezg' // 9000+ Verified HR & Recruiter Emails
]);

function userHasSubscriptionAccess(userType, resourceId) {
  if (!userType) return false;
  const normalized = String(userType).toLowerCase();

  if (normalized === 'basic') {
    return BASIC_FREE_RESOURCE_IDS.has(resourceId);
  }

  if (normalized === 'standard' || normalized === 'booster') {
    if (BASIC_FREE_RESOURCE_IDS.has(resourceId)) return true;
    if (STANDARD_BOOSTER_EXTRA_RESOURCE_IDS.has(resourceId)) return true;
  }

  return false;
}

function sanitize(row) {
  if (!row) return null;
  const o = {};
  for (const [apiKey, dbKey] of Object.entries(mapping)) o[apiKey] = row[dbKey];
  o.createdAt = row.created_at; o.updatedAt = row.updated_at; return o;
}

async function getUserResources(req, res) {
  try {
    const rows = await resources.listPublishedOnly();
    const sanitized = rows.map(sanitize).map((item) => {
      if (!item) return item;
      const { downloadLink, totalDownloads, ...rest } = item;
      return rest;
    });
    res.json({ items: sanitized });
  } catch (e) { console.error('getUserResources error', e); res.status(500).json({ error: 'Internal server error' }); }
}
async function getAdminResources(req, res) {
  try { const rows = await resources.listAll(); res.json({ items: rows.map(sanitize) }); } catch (e) { console.error('getAdminResources error', e); res.status(500).json({ error: 'Internal server error' }); }
}
async function verifyResourcePurchase(req, res) {
  try {
    const body = req.body || {};
    const {
      userId,
      name,
      email,
      resourceId,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature
    } = body;

    if (!userId || !resourceId || !name || !email || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ error: 'userId, resourceId, name, email, razorpay_payment_id, razorpay_order_id, razorpay_signature are required' });
    }

    const authUserId = req.user && req.user.sub;
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin && authUserId !== userId) {
      return res.status(403).json({ error: 'Forbidden: cannot verify payment for another user' });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return res.status(500).json({ error: 'Server misconfigured: Razorpay key secret missing' });
    }

    const expectedSig = crypto
      .createHmac('sha256', keySecret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');
    if (expectedSig !== razorpay_signature) {
      return res.status(400).json({ error: 'Signature mismatch' });
    }

    const resource = await resources.get(resourceId);
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    if (!resource.download_link) {
      return res.status(400).json({ error: 'Resource download link not configured' });
    }

    // increment total downloads for this resource
    try {
      await resources.incrementTotalDownloads(resourceId);
    } catch (incErr) {
      console.error('Failed to increment totalDownloads for resource', resourceId, incErr);
    }

    // Persist direct download_link for the user (no signed URL wrapper)
    const row = await upsertForUserResource(userId, resourceId, resource.download_link);

    return res.status(200).json({
      success: true,
      userId: row.user_id,
      resourceId: row.resource_id,
      downloadLink: resource.download_link
    });
  } catch (e) {
    console.error('verifyResourcePurchase error', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}
async function getResourceAccess(req, res) {
  try {
    const authUserId = req.user && req.user.sub;
    if (!authUserId) return res.status(401).json({ error: 'Unauthorized' });
    const { resourceid } = req.params;
    if (!resourceid) return res.status(400).json({ error: 'resourceid is required' });

    // Always look up the resource so we can serve the download link when access is granted.
    const resource = await resources.get(resourceid);
    if (!resource || !resource.download_link) {
      return res.json({ hasAccess: false });
    }

    // Check if the user already has access via a previous purchase
    const row = await getForUser(authUserId, resourceid);

    let hasSubscriptionAccess = false;
    try {
      // Ensure user_details row exists and fetch user type
      await ensureDefaultRow(authUserId);
      const details = await getByUserId(authUserId);
      const userType = details && details.user_type ? details.user_type : 'free';
      hasSubscriptionAccess = userHasSubscriptionAccess(userType, resourceid);
    } catch (detailsErr) {
      console.error('getResourceAccess user details error', detailsErr);
    }

    // If neither a purchase record nor subscription-based entitlement exists, deny access
    if (!row && !hasSubscriptionAccess) {
      return res.json({ hasAccess: false });
    }

    // At this point, user either purchased the resource or is entitled via subscription plan
    return res.json({ hasAccess: true, signedUrl: resource.download_link });
  } catch (e) {
    console.error('getResourceAccess error', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { ...base, getUserResources, getAdminResources, verifyResourcePurchase, getResourceAccess };
