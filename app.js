require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');
const cors = require('cors');
const methodOverride = require('method-override');
const { authenticatePublic } = require('./middleware/authenticate');
const blogController = require('./controllers/blogController');
const authRouter = require('./routes/api/auth');
const blogRouter = require('./routes/api/blog');
const http = require('http');
const debug = require('debug')('test:server');
const connectDB = require('./connection/db');

const app = express();

// Connect to database
connectDB();

app.use(logger('dev'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ limit: '50mb', extended: false }));
app.use(cookieParser());
app.use(methodOverride('_method'));

// Middleware to log requests
const logRequests = (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
};
app.use(logRequests);

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

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

app.get('/', authenticatePublic, async (req, res) => {
  try {
    const { blogs, randomBlogByCategory, blogsByCategory } =
      await blogController.getAllBlogs();
    res.json({ blogs, randomBlogByCategory, blogsByCategory });
  } catch (error) {
    console.error('Error getting blogs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.use('/api', authRouter);
app.use('/api/blogs', blogRouter);

// Middleware to handle 404 errors
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found', status: 404 });
});

// Middleware to handle errors
app.use((err, req, res, next) => {
  console.error('Error encountered:', err);
  res
    .status(err.status || 500)
    .json({ error: err.message || 'Internal Server Error' });
});

// Set up the server
const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

const server = http.createServer(app);

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

function normalizePort(val) {
  const port = parseInt(val, 10);
  if (isNaN(port)) return val; // Named pipe
  if (port >= 0) return port; // Port number
  return false;
}

function onError(error) {
  if (error.syscall !== 'listen') throw error;
  const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

function onListening() {
  const addr = server.address();
  const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
  debug('Listening on ' + bind);
  console.log('Server started at http://localhost:' + addr.port);
}
