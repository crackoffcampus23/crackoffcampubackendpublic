const express = require('express');
const auth = require('../middleware/auth');
const { verifyPayment, getUserSubscriptions, getRazorpayConfig, createRazorpayOrder } = require('../controllers/paymentController');

const router = express.Router();

// Verify a Razorpay payment and update plan type
router.post('/payment/verify', auth, verifyPayment);

// Get subscription/payment history for a user
router.get('/payment/subscriptions/:userId', auth, getUserSubscriptions);

// Razorpay helper endpoints expected by clients
router.get('/razorpay/config', auth, getRazorpayConfig);
router.post('/razorpay/order', auth, createRazorpayOrder);

module.exports = router;
