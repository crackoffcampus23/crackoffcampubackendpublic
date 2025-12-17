const express = require('express');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');
const {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendNotificationEmail,
  testEmailConfig
} = require('../utils/emailService');

const router = express.Router();

// Test email configuration (admin only)
router.get('/email/test', auth, requireAdmin, async (req, res) => {
  try {
    const result = await testEmailConfig();
    
    if (result.success) {
      res.json({ status: 'success', message: result.message });
    } else {
      res.status(500).json({ status: 'error', error: result.error });
    }
  } catch (error) {
    console.error('Email test error:', error);
    res.status(500).json({ status: 'error', error: 'Internal server error' });
  }
});

// Send custom email (admin only)
router.post('/email/send', auth, requireAdmin, async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;

    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({ 
        error: 'Missing required fields: to, subject, and either text or html' 
      });
    }

    const result = await sendEmail({ to, subject, text, html });

    if (result.success) {
      res.json({
        status: 'success',
        message: 'Email sent successfully',
        messageId: result.messageId
      });
    } else {
      res.status(500).json({
        status: 'error',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send welcome email (admin only)
router.post('/email/welcome', auth, requireAdmin, async (req, res) => {
  try {
    const { userEmail, userName } = req.body;

    if (!userEmail || !userName) {
      return res.status(400).json({ 
        error: 'Missing required fields: userEmail, userName' 
      });
    }

    const result = await sendWelcomeEmail(userEmail, userName);

    if (result.success) {
      res.json({
        status: 'success',
        message: 'Welcome email sent successfully',
        messageId: result.messageId
      });
    } else {
      res.status(500).json({
        status: 'error',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Send welcome email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send password reset email (admin only)
router.post('/email/password-reset', auth, requireAdmin, async (req, res) => {
  try {
    const { userEmail, resetToken } = req.body;

    if (!userEmail || !resetToken) {
      return res.status(400).json({ 
        error: 'Missing required fields: userEmail, resetToken' 
      });
    }

    const result = await sendPasswordResetEmail(userEmail, resetToken);

    if (result.success) {
      res.json({
        status: 'success',
        message: 'Password reset email sent successfully',
        messageId: result.messageId
      });
    } else {
      res.status(500).json({
        status: 'error',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Send password reset email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send notification email (admin only)
router.post('/email/notification', auth, requireAdmin, async (req, res) => {
  try {
    const { userEmail, title, message } = req.body;

    if (!userEmail || !title || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields: userEmail, title, message' 
      });
    }

    const result = await sendNotificationEmail(userEmail, title, message);

    if (result.success) {
      res.json({
        status: 'success',
        message: 'Notification email sent successfully',
        messageId: result.messageId
      });
    } else {
      res.status(500).json({
        status: 'error',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Send notification email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk email sender (admin only)
router.post('/email/bulk', auth, requireAdmin, async (req, res) => {
  try {
    const { recipients, subject, text, html } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ 
        error: 'Recipients must be a non-empty array' 
      });
    }

    if (!subject || (!text && !html)) {
      return res.status(400).json({ 
        error: 'Missing required fields: subject, and either text or html' 
      });
    }

    const results = [];
    
    for (const recipient of recipients) {
      const result = await sendEmail({ 
        to: recipient, 
        subject, 
        text, 
        html 
      });
      
      results.push({
        recipient,
        success: result.success,
        messageId: result.messageId,
        error: result.error
      });
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    res.json({
      status: 'completed',
      message: `Bulk email completed: ${successCount} sent, ${failureCount} failed`,
      results,
      summary: {
        total: results.length,
        success: successCount,
        failures: failureCount
      }
    });
  } catch (error) {
    console.error('Bulk email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;