const express = require('express');
const auth = require('../middleware/auth');
const { requireAdmin, requireUser, requireAdminOrIntern } = require('../middleware/roles');
const ctrl = require('../controllers/jobsController');

const router = express.Router();

router.post('/job', auth, requireAdminOrIntern, ctrl.add);
router.get('/jobs/public', ctrl.getUserJobs);
router.get('/admin/job', auth, requireAdminOrIntern, ctrl.getAdminJobs);
router.get('/job/:jobid', auth, ctrl.getOne);
router.put('/job/:jobid/edit', auth, requireAdminOrIntern, ctrl.update);
router.delete('/job/:jobid/delete', auth, requireAdminOrIntern, ctrl.remove);

module.exports = router;
