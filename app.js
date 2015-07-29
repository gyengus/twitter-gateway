// Read configuration from config.json
var CONFIG = require('./lib/configLoader').load();

if (CONFIG.pmx) {
	var pmx = require('pmx'); // must init pmx before requiring any http module (before requiring express, hapi or other)
	pmx.init({
		http: true,
		errors: true,
		custom_probes: true,
		network: true,
		ports: true
	});

	// Probes
	var probe = pmx.probe();
	var messageCounter = probe.counter({
		name: 'Messages'
	});
	var tweetCounter = probe.counter({
		name: 'Tweets'
	});
}

var restify = require('restify');
var Bunyan = require('bunyan');
var fs = require('fs');
var Twitter = require('twitter');
var Logger = require('./lib/logger');
var sys_logger = new Logger({logdir: __dirname + '/' + CONFIG.logdir + '/'});
var indexPage = require('./routes/index');
var api = require('./routes/api');

// Date format: yyyy-mm-dd H:i:s
global.getFormattedDate = function() {
	var time = new Date();
	var month = ((time.getMonth() + 1) > 9 ? '' : '0') + (time.getMonth() + 1);
	var day = (time.getDate() > 9 ? '' : '0') + time.getDate();
	var hour = (time.getHours() > 9 ? '' : '0') + time.getHours();
	var minute = (time.getMinutes() > 9 ? '' : '0') + time.getMinutes();
	var second = (time.getSeconds() > 9 ? '' : '0') + time.getSeconds();
	return time.getFullYear() + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':' + second;
};

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
server.use(restify.bodyParser({mapParams: true}));
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
loadClients();

server.DEVMODE = (process.argv[2] === '--development');

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
	sys_logger.write(req.body, 'debug');
	req.APP_VERSION = server.APP_VERSION;
	req.APP_NAME = server.APP_NAME;
	req.APP_STARTED = server.APP_STARTED;
	req.DEVMODE = server.DEVMODE;
	req.sys_logger = sys_logger;
	req.twitter_client = server.twitter_client;
	req.CLIENTS = server.CLIENTS;
	if (CONFIG.pmx) {
		req.pmx = pmx;
		req.messageCounter = messageCounter;
		req.tweetCounter = tweetCounter;
	}

	// Authorization
	var path = req.path();
	if (path.indexOf('api') > -1) {
		var client_ip = req.header('x-forwarded-for') || req.connection.remoteAddress;
		var clientData = checkClientForAuthorize(req);

		if (clientData) {
			req.sys_logger.write('Authorized access: ' + clientData.name + '\nClient IP: ' + clientData.ip + '\nURL: ' + path + '\nHeaders: ' + JSON.stringify(req.headers), 'security');
		} else {
			if (CONFIG.pmx) {
				// report to Keymetrics.io
				pmx.emit('Unauthorized access', {
							clientIP : client_ip,
							url : path,
							headers: req.headers
				});
			}
			req.sys_logger.write('Unauthorized access\nClient IP: ' + client_ip + '\nURL: ' + path + '\nHeaders: ' + JSON.stringify(req.headers), 'security');
			res.send(403);
		}
	}
	next();
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
process.on('SIGHUP', loadClients);

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

function loadClients() {
	// Load clients list
	//server.CLIENTS = require('./clients.json');
	server.CLIENTS = JSON.parse(fs.readFileSync('./clients.json', 'utf8'));
	sys_logger.write('Reloaded clients.json', 'system');
}

function checkClientForAuthorize(req) {
	var i = 0;
	var client_ip = req.header('x-forwarded-for') || req.connection.remoteAddress;
	while (i < req.CLIENTS.length) {
		if (req.headers.authorization === 'key=' + req.CLIENTS[i].api_key) {
			var clientData = {};
			clientData = req.CLIENTS[i];
			clientData.ip = client_ip;
			return clientData;
		}
		i++;
	} // while
	return false;
}

if (CONFIG.pmx) {
	server.use(pmx.expressErrorHandler());

	pmx.action('Reload clients', {comment: 'Reload clients data for authorization'}, function(reply) {
		loadClients();
		reply({success: true});
	});
}
