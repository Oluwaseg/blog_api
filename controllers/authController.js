const { User } = require('../models/model');
const crypto = require('crypto');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const {
  createToken,
  createPasswordResetToken,
  comparePassword,
  formatUserResponse,
} = require('../utils/authUtils');
const {
  sendSuccess,
  sendError,
  statusCodes,
} = require('../utils/responseUtils');
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require('../utils/emailService');
const {
  findUserByEmail,
  createUser,
  findUserByResetToken,
  setPasswordResetToken,
  verifyUser,
  updateLastActive,
} = require('../services/userService');

const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !validator.isEmail(email)) {
      return sendError(res, statusCodes.BAD_REQUEST, 'Invalid email format');
    }

    const user = await User.findOne({ email });

    if (!user) {
      return sendError(res, statusCodes.NOT_FOUND, 'User not found');
    }

    if (user.isVerified) {
      return sendError(
        res,
        statusCodes.BAD_REQUEST,
        'User is already verified'
      );
    }

    const verificationToken = crypto.randomBytes(20).toString('hex');
    user.verificationToken = verificationToken;
    await user.save();

    await sendVerificationEmail(user.email, verificationToken);

    return sendSuccess(
      res,
      statusCodes.OK,
      'Verification email sent successfully'
    );
  } catch (error) {
    console.error('Error resending verification email:', error);
    return sendError(
      res,
      statusCodes.INTERNAL_SERVER_ERROR,
      'Internal Server Error',
      error
    );
  }
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!validator.isEmail(email)) {
      return sendError(res, statusCodes.BAD_REQUEST, 'Invalid email format');
    }

    if (!password || password.length < 6) {
      return sendError(
        res,
        statusCodes.BAD_REQUEST,
        'Password must be at least 6 characters long'
      );
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return sendError(res, statusCodes.CONFLICT, 'Email already exists');
    }

    const defaultImageUrl =
      'https://res.cloudinary.com/djc5o8g94/image/upload/v1713910811/blog-folder/default.png';
    let imageUrl = req.file ? req.file.path : defaultImageUrl;

    const { user, verificationToken } = await createUser({
      name,
      email,
      password,
      image: imageUrl,
    });

    try {
      await sendVerificationEmail(user.email, verificationToken);
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      // Continue with registration even if email fails
    }

    return sendSuccess(
      res,
      statusCodes.CREATED,
      'Registration successful. Please check your email to verify your account.'
    );
  } catch (error) {
    console.error('Registration failed:', error);
    return sendError(
      res,
      statusCodes.INTERNAL_SERVER_ERROR,
      'Registration failed',
      error
    );
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(
        res,
        statusCodes.BAD_REQUEST,
        'Email and password are required'
      );
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return sendError(res, statusCodes.NOT_FOUND, "User doesn't exist");
    }
    if (!user.isVerified) {
      return sendError(
        res,
        statusCodes.FORBIDDEN,
        "User isn't verified. Please check your email or resend the verification link."
      );
    }

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return sendError(res, statusCodes.UNAUTHORIZED, 'Invalid password');
    }

    await updateLastActive(user._id);

    const token = createToken(user);

    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000, // 1 hour in milliseconds
    });

    return sendSuccess(res, statusCodes.OK, 'Login successful', {
      user: formatUserResponse(user),
      token,
    });
  } catch (error) {
    return sendError(
      res,
      statusCodes.INTERNAL_SERVER_ERROR,
      'Login failed',
      error
    );
  }
};

const logoutUser = async (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      return sendSuccess(res, statusCodes.OK, 'Already logged out');
    }

    res.clearCookie('jwt', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return sendSuccess(res, statusCodes.OK, 'Logout successful');
  } catch (error) {
    console.error('Logout failed:', error);
    return sendError(
      res,
      statusCodes.INTERNAL_SERVER_ERROR,
      'Logout failed',
      error
    );
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !validator.isEmail(email)) {
      return sendError(res, statusCodes.BAD_REQUEST, 'Valid email is required');
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return sendSuccess(
        res,
        statusCodes.OK,
        'If your email is registered, you will receive a password reset link'
      );
    }

    const token = createPasswordResetToken(user);

    await setPasswordResetToken(user, token, 15 * 60 * 1000); // 15 minutes

    try {
      await sendPasswordResetEmail(email, token);

      return sendSuccess(
        res,
        statusCodes.OK,
        'If your email is registered, you will receive a password reset link'
      );
    } catch (emailError) {
      console.error('Error sending password reset email:', emailError);
      return sendError(
        res,
        statusCodes.INTERNAL_SERVER_ERROR,
        'Failed to send email',
        emailError
      );
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    return sendError(
      res,
      statusCodes.INTERNAL_SERVER_ERROR,
      'Internal Server Error',
      error
    );
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return sendError(
        res,
        statusCodes.BAD_REQUEST,
        'Token and password are required'
      );
    }

    if (password.length < 6) {
      return sendError(
        res,
        statusCodes.BAD_REQUEST,
        'Password must be at least 6 characters long'
      );
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.RESET_PASSWORD_SECRET);
    } catch (jwtError) {
      return sendError(
        res,
        statusCodes.UNAUTHORIZED,
        'Invalid or expired token'
      );
    }

    const user = await findUserByResetToken(decodedToken.email, token);

    if (!user) {
      return sendError(
        res,
        statusCodes.UNAUTHORIZED,
        'Password reset token is invalid or has expired'
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return sendSuccess(res, statusCodes.OK, 'Password reset successful');
  } catch (error) {
    console.error('Reset password error:', error);
    return sendError(
      res,
      statusCodes.INTERNAL_SERVER_ERROR,
      'Internal Server Error',
      error
    );
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return sendError(
        res,
        statusCodes.BAD_REQUEST,
        'Verification token is required'
      );
    }

    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return sendError(
        res,
        statusCodes.NOT_FOUND,
        'Invalid verification token'
      );
    }

    if (user.isVerified) {
      return sendError(
        res,
        statusCodes.BAD_REQUEST,
        'Email is already verified'
      );
    }

    await verifyUser(user);

    return sendSuccess(res, statusCodes.OK, 'Email verified successfully');
  } catch (error) {
    console.error('Email verification error:', error);
    return sendError(
      res,
      statusCodes.INTERNAL_SERVER_ERROR,
      'Failed to verify email',
      error
    );
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
};
