const bcrypt = require('bcrypt');
const { findByEmail, findById } = require('../models/userModel');
const { 
  createResetEntry, 
  refreshOTP, 
  verifyOTP, 
  checkResetPermission, 
  completePasswordReset 
} = require('../models/passwordResetModel');
const { sendOTPEmail } = require('../utils/emailService');
const { pool } = require('../utils/db');

// POST /forgot-password
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const user = await findByEmail(email);
    if (!user) {
      // For security, don't reveal if email exists or not
      return res.json({ 
        success: true, 
        message: 'If the email exists in our system, an OTP has been sent.' 
      });
    }

    // Create reset entry and generate OTP
    const resetEntry = await createResetEntry(user.user_id, email);
    
    // Send OTP email
    const emailResult = await sendOTPEmail(email, resetEntry.otp, user.full_name);
    
    if (!emailResult.success) {
      console.error('Failed to send OTP email:', emailResult.error);
      return res.status(500).json({ error: 'Failed to send OTP email' });
    }

    res.json({
      success: true,
      message: 'OTP has been sent to your email address',
      expiresIn: '5 minutes'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /refresh-otp
async function refreshOTPController(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const user = await findByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'No reset request found for this email' });
    }

    // Refresh OTP
    const resetEntry = await refreshOTP(email);
    
    if (!resetEntry) {
      return res.status(404).json({ 
        error: 'No active reset request found or previous OTP has expired' 
      });
    }

    // Send new OTP email
    const emailResult = await sendOTPEmail(email, resetEntry.otp, user.full_name);
    
    if (!emailResult.success) {
      console.error('Failed to send refreshed OTP email:', emailResult.error);
      return res.status(500).json({ error: 'Failed to send OTP email' });
    }

    res.json({
      success: true,
      message: 'New OTP has been sent to your email address',
      expiresIn: '5 minutes'
    });

  } catch (error) {
    console.error('Refresh OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /verify-otp
async function verifyOTPController(req, res) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    // Verify OTP
    const resetEntry = await verifyOTP(email, otp);
    
    if (!resetEntry) {
      return res.status(400).json({ 
        error: 'Invalid OTP or OTP has expired' 
      });
    }

    res.json({
      success: true,
      message: 'OTP verified successfully',
      userId: resetEntry.user_id,
      resetPassword: true,
      expiresIn: '5 minutes'
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /reset-password
async function resetPassword(req, res) {
  try {
    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
      return res.status(400).json({ error: 'User ID and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if user has valid reset permission
    const resetPermission = await checkResetPermission(userId);
    
    if (!resetPermission) {
      return res.status(403).json({ 
        error: 'No valid reset permission found. Please verify OTP first.' 
      });
    }

    // Check if user exists
    const user = await findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update user password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = now() WHERE user_id = $2',
      [passwordHash, userId]
    );

    // Complete password reset (invalidate the reset entry)
    await completePasswordReset(userId);

    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  forgotPassword,
  refreshOTPController,
  verifyOTPController,
  resetPassword
};