const { User } = require('../models/model');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const secretKey = process.env.JWT_SECRET;

const createToken = (user) => {
  const tokenData = {
    userId: user._id,
    email: user.email,
    name: user.name,
    username: user.username,
    image: user.image,
  };

  const token = jwt.sign(tokenData, secretKey, { expiresIn: '30m' });

  return token;
};

// verify email
const sendVerificationEmail = (email, token) => {
  const verificationLink = `${process.env.CLIENT_URL}/verify-email?token=${token}`;

  // Send email with verification link
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

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

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
};

const resendVerificationEmail = async (email) => {
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    if (user.isVerified) {
      return { success: false, message: 'User is already verified' };
    }

    const verificationToken = crypto.randomBytes(20).toString('hex');
    user.verificationToken = verificationToken;
    await user.save();

    sendVerificationEmail(user.email, verificationToken);

    return { success: true, message: 'Verification email sent successfully' };
  } catch (error) {
    console.error('Error resending verification email:', error);
    return { success: false, message: 'Internal Server Error' };
  }
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!validator.isEmail(email)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid email format' });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ success: false, message: 'Email already exists' });
    }

    const defaultImageUrl =
      'https://res.cloudinary.com/djc5o8g94/image/upload/v1713910811/blog-folder/default.png';
    let imageUrl = req.file ? req.file.path : defaultImageUrl;

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(20).toString('hex');

    const user = new User({
      name,
      email,
      password: hashedPassword,
      image: imageUrl,
      verificationToken,
    });

    await user.save();
    sendVerificationEmail(user.email, verificationToken);

    return res.status(201).json({
      success: true,
      message:
        'Registration successful. Please check your email to verify your account.',
    });
  } catch (error) {
    console.error('Registration failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message,
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User doesn't exist" });
    }
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message:
          "User isn't verified. Please check your email or resend the verification link.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ success: false, message: 'Invalid password' });
    }

    // Password is valid, generate token
    const token = createToken(user);

    res.cookie('jwt', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
      token,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: 'Login failed', error: error.message });
  }
};

const logoutUser = async (req, res) => {
  try {
    // Get token from cookies
    const token = req.cookies.jwt;
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: 'User not authenticated' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    // Clear cookie
    res.clearCookie('jwt');

    return res
      .status(200)
      .json({ success: true, message: 'Logout successful' });
  } catch (error) {
    console.error('Logout failed:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Logout failed', error: error.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    // Generate reset token
    const token = jwt.sign({ email }, process.env.RESET_PASSWORD_SECRET, {
      expiresIn: '15m', // Token expires in 15 minutes
    });

    user.resetPasswordToken = token;
    await user.save();
    // Send email with reset link
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: email,
      subject: 'Password Reset',
      html: `<p>You are receiving this email because you (or someone else) has requested the reset of the password for your account.</p>
            <p>Please click on the following link to reset your password. If you did not request this, please ignore this email and your password will remain unchanged.</p>
            <p><a href="${process.env.CLIENT_URL}/api/reset-password/${token}">Reset Password</a></p>`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to send email',
          error: error.message,
        });
      } else {
        console.log('Email sent:', info.response);
        return res.status(200).json({
          success: true,
          message: 'Password reset email sent successfully',
        });
      }
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    console.log('Received token:', token);
    const decodedToken = jwt.verify(token, process.env.RESET_PASSWORD_SECRET);

    console.log('Decoded token:', decodedToken);
    const user = await User.findOne({ email: decodedToken.email });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    // Check if the resetPasswordToken matches the token provided
    if (user.resetPasswordToken !== token) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    if (typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Bad request: Password must be a string',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    user.resetPasswordToken = null;
    await user.save();

    return res
      .status(200)
      .json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    console.log('body:', req.body);
    const userId = req.user._id;

    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ success: false, message: 'Current password is incorrect' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long',
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    await user.save();

    return res
      .status(200)
      .json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update password',
      error: error.message,
    });
  }
};

const changeProfilePicture = async (req, res) => {
  try {
    const user = req.user;

    // Check if a new profile image was uploaded
    if (req.file) {
      const imageUrl = req.file.path;
      user.image = imageUrl;
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Profile picture updated successfully',
      image: user.image,
    });
  } catch (error) {
    console.error('Error changing profile picture:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile picture',
      error: error.message,
    });
  }
};

const updateUserDetails = async (req, res) => {
  try {
    const { username, name } = req.body;
    const userId = req.user._id;

    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { name }],
      _id: { $ne: userId },
    });

    if (existingUser) {
      return res
        .status(409)
        .json({ success: false, message: 'Username or email already exists' });
    }

    // Update user details
    const user = await User.findById(userId);
    user.username = username;
    user.name = name;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'User details updated successfully',
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Error updating user details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update user details',
      error: error.message,
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  forgotPassword,
  resetPassword,
  updatePassword,
  changeProfilePicture,
  updateUserDetails,
  resendVerificationEmail,
};
