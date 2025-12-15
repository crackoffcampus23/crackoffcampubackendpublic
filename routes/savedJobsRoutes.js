const express = require('express');
const auth = require('../middleware/auth');
const { saveJob, getSavedJobs, removeSavedJob } = require('../controllers/savedJobsController');

const router = express.Router();

// POST /savedjobs { userId, jobId }
router.post('/savedjobs', auth, saveJob);
// GET /getsavedjobs/:userid -> array of jobIds
router.get('/getsavedjobs/:userid', auth, getSavedJobs);
// DELETE /savedjobs { userId, jobId }
router.delete('/savedjobs', auth, removeSavedJob);

module.exports = router;
