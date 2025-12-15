const model = require('../models/interviewKitModel');
const { upsertForUserKit, getForUser } = require('../models/userInterviewKitsModel');
const crypto = require('crypto');

function sanitize(row) {
  if (!row) return null;
  return {
    kitId: row.kit_id,
    kitType: row.kit_type,
    kitName: row.kit_name,
    kitDescription: row.kit_description,
    kitBannerImageUrl: row.kit_banner_image_url,
    kitSkills: row.kit_skills,
    kitUrl: row.kit_url,
    actualPrice: row.actual_price,
    discountedPrice: row.discounted_price,
    published: row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function add(req, res) {
  try {
    const created = await model.create(req.body || {});
    return res.status(201).json({ item: sanitize(created) });
  } catch (e) {
    console.error('interviewKit.add error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getAll(req, res) {
  try {
    const rows = await model.listAll();
    return res.json({ items: rows.map(sanitize) });
  } catch (e) {
    console.error('interviewKit.getAll error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getPublic(req, res) {
  try {
    const rows = await model.listPublic();
    return res.json({ items: rows.map(sanitize) });
  } catch (e) {
    console.error('interviewKit.getPublic error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getOne(req, res) {
  try {
    const { kitid } = req.params;
    if (!kitid) return res.status(400).json({ error: 'kitid param is required' });
    const row = await model.getById(kitid);
    if (!row) return res.status(404).json({ error: 'Not found' });
    return res.json({ item: sanitize(row) });
  } catch (e) {
    console.error('interviewKit.getOne error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function verifyKitPurchase(req, res) {
  try {
    const body = req.body || {};
    const {
      userId,
      name,
      email,
      kitId,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature
    } = body;

    if (!userId || !kitId || !name || !email || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ error: 'userId, kitId, name, email, razorpay_payment_id, razorpay_order_id, razorpay_signature are required' });
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

    const kit = await model.getById(kitId);
    if (!kit) {
      return res.status(404).json({ error: 'Kit not found' });
    }
    if (!kit.kit_url) {
      return res.status(400).json({ error: 'Kit URL not configured' });
    }

    // Persist direct kit_url for the user
    const row = await upsertForUserKit(userId, kitId, kit.kit_url);

    return res.status(200).json({
      success: true,
      userId: row.user_id,
      kitId: row.kit_id,
      kitUrl: kit.kit_url
    });
  } catch (e) {
    console.error('verifyKitPurchase error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getKitAccess(req, res) {
  try {
    const authUserId = req.user && req.user.sub;
    if (!authUserId) return res.status(401).json({ error: 'Unauthorized' });
    const { kitid } = req.params;
    if (!kitid) return res.status(400).json({ error: 'kitid is required' });

    const row = await getForUser(authUserId, kitid);
    if (!row) {
      return res.json({ hasAccess: false });
    }
    const kit = await model.getById(kitid);
    return res.json({ hasAccess: true, kitUrl: kit ? kit.kit_url : row.kit_url });
  } catch (e) {
    console.error('getKitAccess error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteOne(req, res) {
  try {
    const { kitid } = req.params;
    if (!kitid) return res.status(400).json({ error: 'kitid param is required' });
    const ok = await model.deleteById(kitid);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    return res.json({ success: true });
  } catch (e) {
    console.error('interviewKit.deleteOne error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function edit(req, res) {
  try {
    const { kitid } = req.params;
    if (!kitid) return res.status(400).json({ error: 'kitid param is required' });
    const patch = req.body || {};
    const updated = await model.updateById(kitid, patch);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    return res.json({ item: sanitize(updated) });
  } catch (e) {
    console.error('interviewKit.edit error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { add, getAll, getPublic, getOne, verifyKitPurchase, getKitAccess, deleteOne, edit };