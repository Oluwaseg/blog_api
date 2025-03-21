const express = require('express');
const authRouter = require('./api/auth');
const blogRouter = require('./api/blog');
const profileRouter = require('./profileRoutes');
const adminRouter = require('./adminRoutes');
const socialRouter = require('./socialRoutes');

/**
 * Configure API v1 routes
 * @param {Express.Router} router - Express router instance
 */
const configureApiV1Routes = router => {
  // Authentication routes (without /api prefix as it's in the main path)
  router.use('/', authRouter);

  // Content routes
  router.use('/blogs', blogRouter);

  // User management routes
  router.use('/user/profile', profileRouter);

  // Admin routes
  router.use('/admin', adminRouter);

  // Social feature routes
  router.use('/social', socialRouter);
};

/**
 * Configure and register all application routes
 * @param {Express} app - Express application instance
 */
const configureRoutes = app => {
  // API v1 routes
  const apiRouter = express.Router();
  configureApiV1Routes(apiRouter);
  app.use('/api', apiRouter);

  // For future API versioning, you can add:
  // const apiV2Router = express.Router();
  // configureApiV2Routes(apiV2Router);
  // app.use('/api/v2', apiV2Router);
};

module.exports = configureRoutes;
