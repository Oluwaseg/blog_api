const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { User } = require('../../models/model');
const jwt = require('jsonwebtoken');
const authController = require('../../controllers/authController');
const {
  authenticate,
  checkSessionExpiration,
  verifyEmail,
} = require('../../middleware/authenticate');
const { upload } = require('../../middleware/image.config');
require('dotenv').config();

const secretKey = process.env.JWT_SECRET;
const router = express.Router();

// Middleware to clear user session
const clearSession = (req, res, next) => {
  req.logout(() => {});
  next();
};

const baseURL = process.env.BASE_URL;

// Passport setup
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${baseURL}/api/auth/google/callback`,
      passReqToCallback: true,
    },
    async (request, accessToken, refreshToken, profile, done) => {
      try {
        if (
          !profile ||
          !profile.id ||
          !profile.emails ||
          profile.emails.length === 0
        ) {
          return done(new Error('Invalid Google profile'));
        }

        const email = profile.emails[0].value;
        let user = await User.findOne({ email });

        if (!user) {
          user = new User({
            googleId: profile.id,
            name: profile.displayName,
            email,
            image: profile.photos?.[0]?.value || null,
            isVerified: true,
          });
          await user.save();
        }
        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

router.use(passport.initialize());
router.use(passport.session());

// Google OAuth authentication route
router.get(
  '/auth/google',
  clearSession,
  passport.authenticate('google', { scope: ['email', 'profile'] })
);

const createToken = (user) => {
  return jwt.sign(
    { userId: user._id, email: user.email, name: user.name, image: user.image },
    secretKey,
    { expiresIn: '30m' }
  );
};

// Google OAuth callback route
router.get(
  '/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL}/login`,
  }),
  async (req, res) => {
    try {
      const token = createToken(req.user);

      // Redirect to frontend with token in URL
      res.redirect(`${process.env.CLIENT_URL}/oauth-callback?token=${token}`);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

// Authentication routes
router.post('/register', upload.single('image'), authController.registerUser);
router.post('/login', authController.loginUser);
router.post('/logout', authController.logoutUser);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  const result = await authController.resendVerificationEmail(email);
  res.json(result);
});
router.post('/update-password', authenticate, authController.updatePassword);
router.post(
  '/change-profile-picture',
  authenticate,
  upload.single('image'),
  authController.changeProfilePicture
);
router.post(
  '/update-details',
  authenticate,
  checkSessionExpiration,
  authController.updateUserDetails
);

router.get('/verify-email', verifyEmail);
router.get('/getImageUrl', authenticate, (req, res) => {
  res.json({ imageUrl: req.user.image });
});

module.exports = router;
