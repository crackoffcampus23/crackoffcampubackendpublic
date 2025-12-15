const express = require('express');
const router = express.Router();
const { signup, login, cmsAuth, cmsAddAdmin, cmsDeleteAdmin, cmsResetAdminPassword, cmsListAdmins, verifyToken } = require('../controllers/authController');
const { 
  forgotPassword, 
  refreshOTPController, 
  verifyOTPController, 
  resetPassword 
} = require('../controllers/passwordResetController');

router.post('/signup', signup);
router.post('/login', login);
router.post('/cms-auth', cmsAuth);
router.post('/cms-auth/add-admin', cmsAddAdmin);
router.delete('/cms-auth/admin-delete/:emailid', cmsDeleteAdmin);
router.post('/cms-auth/reset-password', cmsResetAdminPassword);
router.get('/cms-auth/alladmin', cmsListAdmins);

// Token verification (accepts Authorization header or body.token/query.token)
router.get('/token/verify', verifyToken);
router.post('/token/verify', verifyToken);

// Password reset routes
router.post('/forgot-password', forgotPassword);
router.post('/refresh-otp', refreshOTPController);
router.post('/verify-otp', verifyOTPController);
router.post('/reset-password', resetPassword);

module.exports = router;
