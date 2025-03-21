const jwt = require('jsonwebtoken');
const { User } = require('../models/model');

const authenticateToken =
  (strict = true) =>
  async (req, res, next) => {
    const token = req.cookies.jwt || req.headers.authorization?.split(' ')[1];
    if (!token) {
      if (strict) {
        return res
          .status(401)
          .json({ error: 'Unauthorized: No token provided' });
      } else {
        return next(); // Allow access without a token in public routes
      }
    }

    try {
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decodedToken.userId);

      if (!user) {
        if (strict) {
          return res
            .status(401)
            .json({ error: 'Unauthorized: User not found' });
        } else {
          return next();
        }
      }

      req.user = user;
      req.session.userId = user._id;
    } catch (error) {
      console.error('Error verifying token:', error);
      if (strict) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
      }
    }

    next();
  };

const authenticate = authenticateToken(true); // Strict authentication (required)
const authenticatePublic = authenticateToken(false);

const checkSessionExpiration = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res
      .status(401)
      .json({ error: 'Session expired. Please log in again.' });
  }
  next();
};

module.exports = {
  authenticate,
  checkSessionExpiration,
  authenticatePublic,
};
