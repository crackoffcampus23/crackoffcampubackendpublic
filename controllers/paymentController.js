const axios = require('axios');
const crypto = require('crypto');
const { pool } = require('../utils/db');
const { upsertByPaymentId, listByUserId } = require('../models/paymentsModel');
const { setPlanType, getByUserId } = require('../models/userDetailsModel');
const { listAllForUser: listUserKits } = require('../models/userInterviewKitsModel');
const { listAllForUser: listUserResources } = require('../models/userResourcesModel');

function sanitizePayment(p) {
  if (!p) return null;
  return {
    id: p.id,
    userId: p.user_id,
    type: p.type,
    planType: p.plan_type,
    razorpayPaymentId: p.razorpay_payment_id,
    razorpayOrderId: p.razorpay_order_id,
    razorpaySignature: p.razorpay_signature,
    verified: p.verified,
    createdAt: p.created_at,
    updatedAt: p.updated_at
  };
}

async function verifyPayment(req, res) {
  try {
    const body = req.body || {};
    const {
      userId,
      type,
      planType,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature
    } = body;

    if (!userId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !type || !planType) {
      return res.status(400).json({ error: 'userId, type, planType, razorpay_payment_id, razorpay_order_id, razorpay_signature are required' });
    }

    // Auth: user can only verify own payment unless admin
    const isAdmin = req.user && req.user.role === 'admin';
    const selfId = req.user && req.user.sub;
    if (!isAdmin && selfId !== userId) {
      return res.status(403).json({ error: 'Forbidden: cannot verify payment for another user' });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return res.status(500).json({ error: 'Server misconfigured: Razorpay keys missing' });
    }

    // Verify signature locally (integrity check)
    const expectedSig = crypto
      .createHmac('sha256', keySecret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');
    if (expectedSig !== razorpay_signature) {
      return res.status(400).json({ error: 'Signature mismatch' });
    }

    // Fetch payment details from Razorpay
    const url = `https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}`;
    let resp;
    try {
      resp = await axios.get(url, {
        auth: { username: keyId, password: keySecret },
        timeout: 10000
      });
    } catch (err) {
      // If Razorpay returns an error response structure
      const data = err.response && err.response.data;
      if (data && data.error && data.error.code === 'BAD_REQUEST_ERROR') {
        return res.status(400).json({ error: 'Payment ID not found or invalid' });
      }
      console.error('Razorpay fetch error', err.message);
      return res.status(502).json({ error: 'Upstream payment verification failed' });
    }

    const paymentData = resp.data;
    if (paymentData && paymentData.error && paymentData.error.code) {
      return res.status(400).json({ error: 'Payment verification failed', details: paymentData.error });
    }

    // Basic validation: ensure status is captured/authorized
    if (paymentData.status && !['captured', 'authorized'].includes(paymentData.status)) {
      return res.status(400).json({ error: `Payment status not acceptable: ${paymentData.status}` });
    }

    // Upsert payment row
    const paymentRow = await upsertByPaymentId({
      userId,
      type,
      planType,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      verified: true,
      raw_response: paymentData
    });

    // Update user plan_type (separate field) if user exists
    const updatedDetails = await setPlanType(userId, planType);

    return res.status(200).json({
      success: true,
      verified: true,
      payment: sanitizePayment(paymentRow),
      planType: updatedDetails ? updatedDetails.plan_type : planType
    });
  } catch (e) {
    console.error('verifyPayment error', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}
async function getUserSubscriptions(req, res) {
  try {
    const authUserId = req.user && req.user.sub;
    const isAdmin = req.user && req.user.role === 'admin';
    const userId = req.params.userId;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Only the user themself or an admin can view subscription details
    if (!isAdmin && authUserId !== userId) {
      return res.status(403).json({ error: 'Forbidden: cannot view another user\'s subscriptions' });
    }

    const userDetails = await getByUserId(userId);
    const payments = await listByUserId(userId);
    const kits = await listUserKits(userId);
    const resources = await listUserResources(userId);

    const kitSubs = kits.map(k => ({
      id: `kit_${k.kit_id}`,
      userId: k.user_id,
      type: 'Interview kit',
      planType: k.kit_name,
      verified: true,
      createdAt: k.created_at,
      updatedAt: k.updated_at,
      kitId: k.kit_id,
      kitUrl: k.kit_url
    }));

    const resourceSubs = resources.map(r => ({
      id: `res_${r.resource_id}`,
      userId: r.user_id,
      type: 'Resource',
      planType: r.resource_name,
      verified: true,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      resourceId: r.resource_id,
      downloadLink: r.signed_url
    }));

    const allSubscriptions = [
      ...payments.map(p => ({
        id: p.id,
        userId: p.user_id,
        type: p.type,
        planType: p.plan_type,
        verified: p.verified,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      })),
      ...kitSubs,
      ...resourceSubs
    ];

    // Sort by createdAt desc
    allSubscriptions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      userId,
      currentPlanType: userDetails ? userDetails.plan_type : null,
      currentUserType: userDetails ? userDetails.user_type : null,
      subscriptions: allSubscriptions
    });
  } catch (e) {
    console.error('getUserSubscriptions error', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Admin: get all subscriptions/payments across all users
async function getAllSubscriptions(req, res) {
  try {
    // payments table (plan subscriptions, services, etc.)
    const paymentsPromise = pool.query('SELECT * FROM payments ORDER BY created_at DESC');

    // interview kits owned by users
    const kitsPromise = pool.query(
      `SELECT uik.*, ipk.kit_name
       FROM user_interview_kits uik
       JOIN interview_preperation_kit ipk ON uik.kit_id = ipk.kit_id`
    );

    // resources owned by users
    const resourcesPromise = pool.query(
      `SELECT ur.*, r.resource_name
       FROM user_resources ur
       JOIN resources r ON ur.resource_id = r.resource_id`
    );

    const [paymentsResult, kitsResult, resourcesResult] = await Promise.all([
      paymentsPromise,
      kitsPromise,
      resourcesPromise
    ]);

    const payments = paymentsResult.rows || [];
    const kits = kitsResult.rows || [];
    const resources = resourcesResult.rows || [];

    const paymentSubs = payments.map(p => ({
      id: p.id,
      userId: p.user_id,
      type: p.type,
      planType: p.plan_type,
      verified: p.verified,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      source: 'payment'
    }));

    const kitSubs = kits.map(k => ({
      id: `kit_${k.kit_id}_${k.user_id}`,
      userId: k.user_id,
      type: 'Interview kit',
      planType: k.kit_name,
      verified: true,
      createdAt: k.created_at,
      updatedAt: k.updated_at,
      kitId: k.kit_id,
      kitUrl: k.kit_url,
      source: 'kit'
    }));

    const resourceSubs = resources.map(r => ({
      id: `res_${r.resource_id}_${r.user_id}`,
      userId: r.user_id,
      type: 'Resource',
      planType: r.resource_name,
      verified: true,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      resourceId: r.resource_id,
      downloadLink: r.signed_url,
      source: 'resource'
    }));

    const all = [...paymentSubs, ...kitSubs, ...resourceSubs];

    all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({ items: all });
  } catch (e) {
    console.error('getAllSubscriptions error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { verifyPayment, getUserSubscriptions, getAllSubscriptions };
// --- Razorpay helper endpoints ---

async function getRazorpayConfig(req, res) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    if (!keyId) return res.status(500).json({ error: 'Server misconfigured: Razorpay key missing' });
    return res.json({ keyId });
  } catch (e) {
    console.error('getRazorpayConfig error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function createRazorpayOrder(req, res) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return res.status(500).json({ error: 'Server misconfigured: Razorpay keys missing' });
    }

    const body = req.body || {};
    const amount = Number(body.amount);
    const currency = (body.currency || 'INR').toString();
    const receipt = body.receipt || `rcpt_${Date.now()}`;

    if (!amount || Number.isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'amount (in smallest currency unit) is required and must be > 0' });
    }

    let resp;
    try {
      const amountForGateway = currency.toUpperCase() === 'INR' ? Math.round(amount * 100) : amount;
      resp = await axios.post('https://api.razorpay.com/v1/orders', {
        amount: amountForGateway,
        currency,
        receipt,
      }, {
        auth: { username: keyId, password: keySecret },
        timeout: 10000,
      });
    } catch (err) {
      const data = err.response && err.response.data;
      console.error('createRazorpayOrder error', data || err.message);
      return res.status(502).json({ error: 'Failed to create order with Razorpay' });
    }

    const order = resp.data;
    return res.status(201).json({ order: { id: order.id, amount: order.amount, currency: order.currency } });
  } catch (e) {
    console.error('createRazorpayOrder fatal', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports.getRazorpayConfig = getRazorpayConfig;
module.exports.createRazorpayOrder = createRazorpayOrder;
module.exports.getAllSubscriptions = getAllSubscriptions;
