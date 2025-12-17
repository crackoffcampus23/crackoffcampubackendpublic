const express = require('express');
const auth = require('../middleware/auth');
const { requireAdmin, requireUser } = require('../middleware/roles');
const ctrl = require('../controllers/jobsController');

const router = express.Router();

router.post('/job', auth, requireAdmin, ctrl.add);
router.get('/jobs/public', ctrl.getUserJobs);
router.get('/admin/job', auth, requireAdmin, ctrl.getAdminJobs);
router.get('/job/:jobid', auth, ctrl.getOne);
router.put('/job/:jobid/edit', auth, requireAdmin, ctrl.update);
router.delete('/job/:jobid/delete', auth, requireAdmin, ctrl.remove);

module.exports = router;
