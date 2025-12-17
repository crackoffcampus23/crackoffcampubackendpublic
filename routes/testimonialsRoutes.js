const express = require('express');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');
const ctrl = require('../controllers/testimonialsController');

const router = express.Router();

// New endpoints as requested (note: intentional spelling per spec)
router.post('/testemonial', auth, requireAdmin, ctrl.add);
router.get('/gettestemonnial', ctrl.getAll);
router.delete('/testemonial/:videostoryid', auth, requireAdmin, ctrl.deleteOne);
router.put('/edittestemonial/:videostoryid', auth, requireAdmin, ctrl.edit);

module.exports = router;
