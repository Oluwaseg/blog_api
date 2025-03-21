const http = require('http');
const debug = require('debug')('test:server');
const app = require('./app');

/**
 * Normalize port value
 */
const normalizePort = val => {
  const port = parseInt(val, 10);
  if (isNaN(port)) return val; // Named pipe
  if (port >= 0) return port; // Port number
  return false;
};

/**
 * Handle specific server errors
 */
const onError = error => {
  if (error.syscall !== 'listen') throw error;
  const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      throw new Error('Elevated privileges required');
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      throw new Error('Port already in use');
    default:
      throw error;
  }
};

/**
 * Event listener for server "listening" event
 */
const onListening = () => {
  const addr = server.address();
  const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
  debug('Listening on ' + bind);
  console.log('Server started at http://localhost:' + addr.port);
};

// Set up the port
const port = normalizePort(process.env.PORT || '3001');
app.set('port', port);

// Create HTTP server
const server = http.createServer(app);

// Set up event listeners
server.on('error', onError);
server.on('listening', onListening);

// Start the server
server.listen(port);
