const express = require('express');
const { verifySlot } = require('../controllers/serviceSlotController');

const router = express.Router();

// Public endpoint: POST /serviceverifier
router.post('/serviceverifier', verifySlot);

module.exports = router;
