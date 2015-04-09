var express = require('express');
var router = express.Router();

router.use(function(req, res, next) {
	//res.send('csilla');
	req.sys_logger.write('csilla', 'debug');
	//res.redirect('/');
	next();
});

router.route('/messages')
	.get(function(req, res, next) {
		res.send('üzenetek listája');
	});

router.route('/message')
	.put(function(req, res, next) {
		res.send('új üzenet küldése');
	});

router.route('/message/:id')
	.get(function(req, res, next) {
		res.send('egy üzenet');
	})
	.delete(function(req, res, next) {
		res.send('üzenet törlése')
	});

module.exports = router;
