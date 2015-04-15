var http = require('http');

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var fs = require('fs');
var Twitter = require('twitter');
var Logger = require('./lib/logger');
var sys_logger = new Logger({logdir: __dirname + '/logs/'});

var routes = require('./routes/index');
var api = require('./routes/api');

// Date format: yyyy-mm-dd H:i:s
Date.prototype.getFormattedDate = function() {
	var time = this;
	var month = ((time.getMonth() + 1) > 9 ? '' : '0') + (time.getMonth() + 1);
	var day = (time.getDate() > 9 ? '' : '0') + time.getDate();
	var hour = (time.getHours() > 9 ? '' : '0') + time.getHours();
	var minute = (time.getMinutes() > 9 ? '' : '0') + time.getMinutes();
	var second = (time.getSeconds() > 9 ? '' : '0') + time.getSeconds();
	return time.getFullYear() + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':' + second;
};


var app = express();
app.APP_STARTED = new Date().getTime();
app.sys_logger = sys_logger;

// Read configuration from config.json
var CONFIG = require('./config.json');
app.APP_NAME = CONFIG.name;
app.LOGDIR = CONFIG.logdir;

app.twitter_client = new Twitter({
	consumer_key: CONFIG.consumer_key,
	consumer_secret: CONFIG.consumer_secret,
	access_token_key: CONFIG.access_token_key,
	access_token_secret: CONFIG.access_token_secret
});

// Read version from package.json
app.APP_VERSION = require('./package.json').version;
sys_logger.write('Application started, version: ' + app.APP_VERSION, 'system');

// Read clients informations
app.CLIENTS = require('./clients.json');

if (process.argv[2] === '--development') {
	app.DEVMODE = true;
} else {
	app.DEVMODE = false;
}

//app.use(favicon(__dirname + '/public/favicon.ico'));
app.set('trust proxy', function(ip) {
	if (ip === '127.0.0.1') return true;
	return false;
});
var accesslogStream = fs.createWriteStream(__dirname + '/' + app.LOGDIR + '/access.log', {flags: 'a'});
app.use(logger('combined', {stream: accesslogStream}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// a middleware with no mount path, gets executed for every request to the router
app.use(function(req, res, next) {
	req.APP_VERSION = app.APP_VERSION;
	req.APP_NAME = app.APP_NAME;
	req.APP_STARTED = app.APP_STARTED;
	req.DEVMODE = app.DEVMODE;
	req.sys_logger = sys_logger;
	req.twitter_client = app.twitter_client;
	req.CLIENTS = app.CLIENTS;
	next();
});

app.use('/', routes);
app.use('/api', api);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

// error handlers

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
	// mentsük fájlba
	var logerror = err.message + '\nURL: ' + req.originalUrl + '\nHeaders: ' + JSON.stringify(req.headers) + '\nError: ' + JSON.stringify(err) + '\nStack: ' + err.stack;
	req.sys_logger.write(logerror, 'error');
	res.sendStatus(err.status || 500);
});

// signal handler, SIGHUP-ot külön szedni
process.on('SIGHUP', function() {
	// Kliens lista újratöltése
	app.CLIENTS = require('./clients.json');
	sys_logger.write('SIGHUP signal received, reloaded clients.json', 'system');
});

['SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
	'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
	].forEach(function(element, index, array) {
		process.on(element, function() {
			sys_logger.write('Application stopped by ' + element + ' signal', 'system', function() {
				process.exit();
			});
		});
	});

// Listening IP address
var ip_address = CONFIG.address || process.env.OPENSHIFT_NODEJS_IP || process.env.NODE_IP || '0.0.0.0';

/**
 * Get port from config or environment and store in Express.
 */
var port = normalizePort(CONFIG.port || process.env.PORT || '51635');
app.set('port', port);

/**
 * Create HTTP server.
 */
var server = http.createServer(app);

/**
 * Listen on provided port and network interfaces.
 */
server.listen(port, ip_address, function() {
	app.sys_logger.write('Listening: ' + server.address().address + ':' + server.address().port, 'system');
	if (app.DEVMODE) console.log('Listening: ' + server.address().address + ':' + server.address().port);
});
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
	var port = parseInt(val, 10);

	if (isNaN(port)) {
		// named pipe
		return val;
	}

	if (port >= 0) {
		// port number
		return port;
  	}

	return false;
}

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
	if (error.syscall !== 'listen') {
		throw error;
	}

	var bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

	// handle specific listen errors with friendly messages
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

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
	/*var addr = server.address();
	var bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
	app.sys_logger.write('Debug: Listening on ' + bind, "system");*/
}
