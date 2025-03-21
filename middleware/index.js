const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');
const cors = require('cors');
const methodOverride = require('method-override');
const { notFound, errorHandler } = require('./errorMiddleware');

/**
 * Configure and register all global middleware
 * @param {Express} app - Express application instance
 */
const configureMiddleware = (app) => {
  // Basic middleware
  app.use(logger('dev'));
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ limit: '50mb', extended: false }));
  app.use(cookieParser());
  app.use(methodOverride('_method'));

  // Logging middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // Session configuration
  const sessionOptions = {
    secret: process.env.SESSION_SECRET || 'defaultSecret',
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 30 * 60 * 1000,
      secure: process.env.NODE_ENV === 'production',
    },
  };
  app.use(session(sessionOptions));

  // Static files
  app.use(express.static(path.join(process.cwd(), 'public')));
};

/**
 * Configure error handling middleware
 * @param {Express} app - Express application instance
 */
const configureErrorHandlers = (app) => {
  app.use(notFound);
  app.use(errorHandler);
};

module.exports = {
  configureMiddleware,
  configureErrorHandlers,
};
