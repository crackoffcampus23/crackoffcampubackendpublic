const express = require('express');
const auth = require('../middleware/auth');
const { requireAdmin, requireUser } = require('../middleware/roles');
const ctrl = require('../controllers/interviewKitController');

const router = express.Router();

// Create kit (admin only)
router.post('/interviewkit', auth, requireAdmin, ctrl.add);

// Admin list all (admin only)
router.get('/getinterviewkit', auth, requireAdmin, ctrl.getAll);

// Public list published
router.get('/getinterviewkit/public', ctrl.getPublic);

// Get one kit
router.get('/interviewkit/:kitid', auth, ctrl.getOne);

// Check access
router.get('/interviewkit/:kitid/access', auth, requireUser, ctrl.getKitAccess);

// Verify purchase
router.post('/interviewkit/verify', auth, requireUser, ctrl.verifyKitPurchase);

// Edit kit (admin only)
router.put('/interviewkit/:kitid', auth, requireAdmin, ctrl.edit);

// Delete kit (admin only)
router.delete('/interviewkit/:kitid', auth, requireAdmin, ctrl.deleteOne);

module.exports = router;
