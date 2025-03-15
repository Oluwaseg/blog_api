const jwt = require('jsonwebtoken');
const { User } = require('../models/model');

const authenticateToken = async (req, res, next) => {
  const token = req.cookies.jwt;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decodedToken.userId);

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }

    req.user = user;
    req.session.userId = user._id;
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// Less Strict Authentication Middleware
const authenticateTokenPublic = async (req, res, next) => {
  const token = req.cookies.jwt;

  if (!token) {
    return next();
  }

  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decodedToken.userId);

    if (user) {
      req.user = user;
      req.session.userId = user._id;
    }
  } catch (error) {
    console.error('Error verifying token:', error);
  }

  next();
};

const checkSessionExpiration = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res
      .status(401)
      .json({ error: 'Session expired. Please log in again.' });
  }
  next();
};

const verifyEmail = async (req, res) => {
  try {
    const token = req.query.token;

    if (!token) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.verificationToken = null;
    user.isVerified = true;
    await user.save();

    res.json({ message: 'Email successfully verified' });
  } catch (error) {
    console.error('Verification failed:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  authenticateToken,
  checkSessionExpiration,
  authenticateTokenPublic,
  verifyEmail,
};
