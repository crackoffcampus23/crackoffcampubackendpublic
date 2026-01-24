const nodemailer = require('nodemailer');

// Gmail configuration
const createTransporter = () => {
const config = {
  host: 'smtp.hostinger.com',
  port: 465,                 
  secure: true,              
  auth: {
    user: 'admin@crackoffcampus.com',
    pass: process.env.NODEMAILER_PASSWORD
  }
};

if (!process.env.NODEMAILER_PASSWORD) {
  console.warn('NODEMAILER_PASSWORD not found in environment variables');
  return null;
}

return nodemailer.createTransport(config);
};
// Send email function
const sendEmail = async ({ to, subject, text, html, replyTo }) => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      throw new Error('Email transporter not configured properly');
    }

    // convert plain text to safe HTML with preserved line breaks when html not provided
    const escapeHtml = (str) => {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    const textToHtml = (txt) => {
      const escaped = escapeHtml(txt || '');
      return escaped.replace(/\r\n|\r|\n/g, '<br>');
    };

    const mailOptions = {
      from: `"Crack Off-Campus" <admin@crackoffcampus.com>`,
      to,
      subject,
      text,
      html: html || textToHtml(text),
    };

    const info = await transporter.sendMail(mailOptions);
    
    return {
      success: true,
      messageId: info.messageId,
      response: info.response
    };
  } catch (error) {
    console.error('Email sending error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Predefined email templates
const sendWelcomeEmail = async (userEmail, userName) => {
  const subject = 'Welcome to Crack Off-Campus!';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Welcome to Crack Off-Campus, ${userName}!</h2>
      <p>Thank you for joining our platform. We're excited to help you on your career journey.</p>
      <p>Here's what you can do:</p>
      <ul>
        <li>Browse exclusive job opportunities</li>
        <li>Access premium services</li>
        <li>Download useful resources</li>
        <li>Read testimonials from successful candidates</li>
      </ul>
      <p>If you have any questions, feel free to reach out to us.</p>
      <p>Best regards,<br>The Crack Off-Campus Team</p>
    </div>
  `;

  return await sendEmail({
    to: userEmail,
    subject,
    html
  });
};

const sendPasswordResetEmail = async (userEmail, resetToken) => {
  const subject = 'Password Reset Request - Crack Off-Campus';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Password Reset Request</h2>
      <p>You requested a password reset for your Crack Off-Campus account.</p>
      <p>Your reset token is: <strong>${resetToken}</strong></p>
      <p>This token will expire in 1 hour for security reasons.</p>
      <p>If you didn't request this reset, please ignore this email.</p>
      <p>Best regards,<br>The Crack Off-Campus Team</p>
    </div>
  `;

  return await sendEmail({
    to: userEmail,
    subject,
    html
  });
};

const sendNotificationEmail = async (userEmail, title, message) => {
  const subject = `Notification: ${title}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">${title}</h2>
      <p>${message}</p>
      <p>Thank you for using Crack Off-Campus!</p>
      <p>Best regards,<br>The Crack Off-Campus Team</p>
    </div>
  `;

  return await sendEmail({
    to: userEmail,
    subject,
    html
  });
};

const sendOTPEmail = async (userEmail, otp, userName = 'User') => {
  const subject = 'Password Reset OTP - Crack Off-Campus';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #333; margin: 0;">Crack Off-Campus</h1>
        <p style="color: #666; margin: 5px 0;">Password Reset Request</p>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
        <h2 style="color: #333; margin-top: 0;">Hello ${userName},</h2>
        <p style="margin-bottom: 15px;">You requested a password reset for your Crack Off-Campus account.</p>
        
        <div style="background-color: #fff; padding: 15px; border-radius: 4px; text-align: center; margin: 20px 0;">
          <p style="margin: 0; color: #666; font-size: 14px;">Your OTP Code:</p>
          <h1 style="margin: 10px 0; color: #007bff; font-size: 32px; letter-spacing: 4px; font-family: 'Courier New', monospace;">${otp}</h1>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0; color: #856404; font-size: 14px;">
            <strong>⚠️ Important:</strong> This OTP is valid for only <strong>5 minutes</strong> for security reasons.
          </p>
        </div>
      </div>
      
      <div style="margin-bottom: 20px;">
        <p style="color: #666; font-size: 14px; margin-bottom: 10px;">If you didn't request this password reset, please ignore this email. Your account remains secure.</p>
        <p style="color: #666; font-size: 14px;">Need help? Contact our support team.</p>
      </div>
      
      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px; margin: 0;">
          This is an automated message from Crack Off-Campus.<br>
          Please do not reply to this email.
        </p>
      </div>
    </div>
  `;

  return await sendEmail({
    to: userEmail,
    subject,
    html
  });
};

// Test email configuration
const testEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      return { success: false, error: 'Transporter not configured' };
    }

    await transporter.verify();
    return { success: true, message: 'Email configuration is valid' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendNotificationEmail,
  sendOTPEmail,
  testEmailConfig
};