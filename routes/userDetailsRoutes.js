const express = require('express');
const auth = require('../middleware/auth');
const { getUserDetails, editUserDetails } = require('../controllers/userDetailsController');

const router = express.Router();

// Allow both admin and normal users:
// - Admin: list all when no ?userId=, or fetch specific user by ?userId=
// - User: always fetch own details (ignores ?userId=)
router.get('/getuserdetails', auth, getUserDetails);
router.put('/:userid/edit', auth, editUserDetails);

module.exports = router;
