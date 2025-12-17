const express = require('express');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');
const { verifyService, getAllVerifications } = require('../controllers/serviceVerifyController');

const router = express.Router();

// POST /service/verify
router.post('/service/verify', auth, verifyService);

// GET /serviceverifcation (admin only) - fetch all service_verifications
router.get('/serviceverifcation', auth, requireAdmin, getAllVerifications);

module.exports = router;
