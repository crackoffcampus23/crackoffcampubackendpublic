const express = require('express');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');
const ctrl = require('../controllers/userFeedbackController');

const router = express.Router();

// Public submission route (no auth)
router.post('/submitfeedback', ctrl.submitFeedback);

// Admin-only list all
router.get('/getallfeedback', auth, requireAdmin, ctrl.getAllFeedback);

// Admin-only delete by id
router.delete('/feedback/:feedbackid', auth, requireAdmin, ctrl.deleteFeedback);

module.exports = router;
