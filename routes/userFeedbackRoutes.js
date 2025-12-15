const express = require('express');
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');
const ctrl = require('../controllers/userFeedbackController');

const router = express.Router();

// Rate limit: 3 submissions per 10 minutes per IP
const submitLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many feedback submissions, please try again later.' }
});

// Public submission route (no auth), with per-IP limiter
router.post('/submitfeedback', submitLimiter, ctrl.submitFeedback);

// Admin-only list all
router.get('/getallfeedback', auth, requireAdmin, ctrl.getAllFeedback);

// Admin-only delete by id
router.delete('/feedback/:feedbackid', auth, requireAdmin, ctrl.deleteFeedback);

module.exports = router;
