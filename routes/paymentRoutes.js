const express = require('express');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');
const { verifyPayment, getUserSubscriptions, getAllSubscriptions, getRazorpayConfig, createRazorpayOrder } = require('../controllers/paymentController');

const router = express.Router();

// Verify a Razorpay payment and update plan type
router.post('/payment/verify', auth, verifyPayment);

// Get subscription/payment history for a user
router.get('/payment/subscriptions/:userId', auth, getUserSubscriptions);

// Admin: get all subscriptions/payments for all users
router.get('/admin/payment/subscriptions', auth, requireAdmin, getAllSubscriptions);

// Razorpay helper endpoints expected by clients
router.get('/razorpay/config', auth, getRazorpayConfig);
router.post('/razorpay/order', auth, createRazorpayOrder);

module.exports = router;
