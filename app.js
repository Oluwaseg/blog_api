require('dotenv').config();
const express = require('express');
const { authenticatePublic } = require('./middleware/authenticate');
const blogController = require('./controllers/blogController');
const configureRoutes = require('./routes');
const { configureMiddleware, configureErrorHandlers } = require('./middleware');
const connectDB = require('./connection/db');

const app = express();

// Connect to database
connectDB();

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
