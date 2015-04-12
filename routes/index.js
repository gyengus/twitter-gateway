var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
	var info = {};
	info.name = req.APP_NAME;
	info.version = req.APP_VERSION;
	info.uptime = (new Date().getTime() - req.APP_STARTED) / 60000; // minutes
	res.json(info);
});

module.exports = router;
