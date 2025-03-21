const nodemailer = require('nodemailer');
require('dotenv').config();

/**
 * Creates and returns a configured email transporter
 * @returns {Object} Nodemailer transporter
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

/**
 * Sends an email verification message with token
 * @param {string} email - User's email address
 * @param {string} token - Verification token
 * @returns {Promise} Result of email sending operation
 */
const sendVerificationEmail = (email, token) => {
  const verificationLink = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: email,
    subject: 'Email Verification',
    html: `<div style="font-family: Arial, sans-serif;">
    <h1 style="color: #333;">Welcome to Our Website !</h1>

    <p>Thank you for registering with us. To complete your registration, please click the button below to verify your email:</p>
    <a href="${verificationLink}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-align: center; text-decoration: none; display: inline-block; border-radius: 4px; cursor: pointer;">Verify Email</a>
    <p>If you didn't register on our website, you can ignore this email.</p>
    <p>Best regards,<br/>Your Website Team</p>
  </div>`,
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        reject(error);
      } else {
        console.log('Email sent:', info.response);
        resolve(info);
      }
    });
  });
};

/**
 * Sends a password reset email with token
 * @param {string} email - User's email address
 * @param {string} token - Reset token
 * @returns {Promise} Result of email sending operation
 */
const sendPasswordResetEmail = (email, token) => {
  const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: email,
    subject: 'Password Reset',
    html: `<div style="font-family: Arial, sans-serif;">
      <h2 style="color: #333;">Password Reset Request</h2>
      <p>You are receiving this email because you (or someone else) has requested to reset the password for your account.</p>
      <p>Please click on the following button to reset your password. If you did not request this, please ignore this email and your password will remain unchanged.</p>
      <a href="${resetLink}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-align: center; text-decoration: none; display: inline-block; border-radius: 4px; cursor: pointer;">Reset Password</a>
      <p>This link will expire in 15 minutes.</p>
      <p>Best regards,<br/>Your Website Team</p>
    </div>`,
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        reject(error);
      } else {
        console.log('Email sent:', info.response);
        resolve(info);
      }
    });
  });
};

module.exports = {
  createTransporter,
  sendVerificationEmail,
  sendPasswordResetEmail,
};
