const express = require('express');
const auth = require('../middleware/auth');
const { requireAdmin, requireUser } = require('../middleware/roles');
const ctrl = require('../controllers/resourcesController');

const router = express.Router();

router.post('/resource', auth, requireAdmin, ctrl.add);
router.get('/resources/public', ctrl.getUserResources);
router.get('/admin/resource', auth, requireAdmin, ctrl.getAdminResources);
router.get('/resource/:resourceid', auth, ctrl.getOne);
router.get('/resource/:resourceid/access', auth, requireUser, ctrl.getResourceAccess);
router.put('/resource/:resourceid/edit', auth, requireAdmin, ctrl.update);
router.delete('/resource/:resourceid/delete', auth, requireAdmin, ctrl.remove);

// Verify a Razorpay payment for a resource and grant access
router.post('/resource/verify', auth, requireUser, ctrl.verifyResourcePurchase);

module.exports = router;
