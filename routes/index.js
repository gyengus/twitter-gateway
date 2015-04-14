var express = require('express');
var router = express.Router();

router.all('/', function(req, res, next) {
	var info = {};
	info.name = req.APP_NAME;
	info.version = req.APP_VERSION;
	info.uptime = (new Date().getTime() - req.APP_STARTED) / 60000; // minutes
	//if (express.get('env') === 'development') {
		info.headers = req.headers;
		info.parameters = req.query;
		info.body = req.body;
	//}
	res.json(info);
});

module.exports = router;