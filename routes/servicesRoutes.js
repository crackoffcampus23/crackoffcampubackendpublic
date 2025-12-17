const express = require('express');
const auth = require('../middleware/auth');
const { requireAdmin, requireUser } = require('../middleware/roles');
const ctrl = require('../controllers/servicesController');

const router = express.Router();

router.post('/service', auth, requireAdmin, ctrl.add);
router.get('/services/public', ctrl.getUserServices);
router.get('/admin/service', auth, requireAdmin, ctrl.getAdminServices);
router.get('/service/:serviceid', auth, ctrl.getOne);
router.put('/service/:serviceid/edit', auth, requireAdmin, ctrl.update);
router.delete('/service/:serviceid/delete', auth, requireAdmin, ctrl.remove);

// Most popular flag (admin-only)
router.get('/service/:serviceid/mostpopular', auth, requireAdmin, ctrl.getMostPopularStatus);
router.put('/service/:serviceid/mostpopular', auth, requireAdmin, ctrl.updateMostPopular);

module.exports = router;
