var restify = require('restify');
var Bunyan = require('bunyan');
var fs = require('fs');
var Twitter = require('twitter');
var Logger = require('./lib/logger');
var sys_logger = new Logger({logdir: __dirname + '/logs/'});
var indexPage = require('./routes/index');
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

// Read configuration from config.json
var CONFIG = require('./config.json');

var bunyanlog = new Bunyan({
	name: CONFIG.name,
	streams: [
		{
			path: CONFIG.logdir + '/access.log',
			level: 'trace'
		}
	],
	serializers: {
		req: Bunyan.stdSerializers.req,
		res: restify.bunyan.serializers.res
	}
});

var server = restify.createServer({
	name: CONFIG.name,
	log: bunyanlog
});
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());
server.use(restify.gzipResponse());

server.APP_STARTED = new Date().getTime();
server.sys_logger = sys_logger;

server.APP_NAME = CONFIG.name;
server.LOGDIR = CONFIG.logdir;

server.twitter_client = new Twitter({
	consumer_key: CONFIG.consumer_key,
	consumer_secret: CONFIG.consumer_secret,
	access_token_key: CONFIG.access_token_key,
	access_token_secret: CONFIG.access_token_secret
});

// Read version from package.json
server.APP_VERSION = require('./package.json').version;
sys_logger.write('Application started, version: ' + server.APP_VERSION, 'system');

// Read clients informations
server.CLIENTS = require('./clients.json');

if (process.argv[2] === '--development') {
	server.DEVMODE = true;
} else {
	server.DEVMODE = false;
}

var ip_address = CONFIG.address || process.env.OPENSHIFT_NODEJS_IP || process.env.NODE_IP || '0.0.0.0';
var port = CONFIG.port || process.env.PORT || '51635';
server.listen(port, ip_address, function () {
	server.sys_logger.write('Listening: ' + ip_address + ':' + port, 'system');
	if (server.DEVMODE) console.log('Listening: ' + ip_address + ':' + port);
});

server.pre(function(req, res, next) {
	req.log.info({req: req}, 'start');
	return next();
});

server.on('after', function(req, res, route) {
	req.log.info({res: res}, 'finished');
});

server.use(function(req, res, next) {
	sys_logger.write(req, 'debug');
	req.APP_VERSION = server.APP_VERSION;
	req.APP_NAME = server.APP_NAME;
	req.APP_STARTED = server.APP_STARTED;
	req.DEVMODE = server.DEVMODE;
	req.sys_logger = sys_logger;
	req.twitter_client = server.twitter_client;
	req.CLIENTS = server.CLIENTS;

	// Authorization
	var path = req.path();
	if (path.indexOf('api') > -1) {
		var i = 0;
		var x = req.CLIENTS.length;
		var client_ip = req.header('x-forwarded-for') || req.connection.remoteAddress;
		var authok = false;
		while (i < x) {
			if (req.headers.authorization == 'key=' + req.CLIENTS[i].api_key) {
				authok = true;
				break;
			}
			i++;
		} // while
		if (authok) {
			req.sys_logger.write('Authorized access: ' + req.CLIENTS[i].name + '\nClient IP: ' + client_ip + '\nURL: ' + path + '\nHeaders: ' + JSON.stringify(req.headers), 'security');
			next();
		} else {
			req.sys_logger.write('Unauthorized access\nClient IP: ' + client_ip + '\nURL: ' + path + '\nHeaders: ' + JSON.stringify(req.headers), 'security');
			res.send(403);
			next();
		}
	} else {
		next();
	}
});

// routes
server.get('/', indexPage);
server.get('/api/messages', api.getMessages);
server.put('/api/message', api.newMessage);
server.get('/api/message/:id', api.getMessage);
server.del('/api/message/:id', api.delMessage);
server.get('/api/statuses', api.getStatuses);
server.put('/api/status', api.newStatus);
server.del('/api/status/:id', api.delStatus);

// signal handler, SIGHUP
process.on('SIGHUP', function() {
	// Reload clients list
	server.CLIENTS = require('./clients.json');
	sys_logger.write('SIGHUP signal received, reloaded clients.json', 'system');
});

// other signals
['SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
	'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
	].forEach(function(element, index, array) {
		process.on(element, function() {
			sys_logger.write('Application stopped by ' + element + ' signal', 'system', function() {
				process.exit();
			});
		});
	});

