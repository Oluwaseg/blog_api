require('dotenv').config();
const express = require('express');
const configureRoutes = require('./routes');
const { configureMiddleware, configureErrorHandlers } = require('./middleware');
const connectDB = require('./connection/db');
const { connectRedis } = require('./utils/redisClient');

const app = express();

// Connect to database
connectDB();

// Connect to Redis
connectRedis().catch(err => {
  console.warn(
    'Redis connection failed, continuing without caching:',
    err.message
  );
});

// Configure middleware
configureMiddleware(app);

// Health check route
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// Configure routes
configureRoutes(app);

// Configure error handlers
configureErrorHandlers(app);

module.exports = app;
