var express = require('express');
var router = express.Router();

function in_array(needle, haystack) {
    var length = haystack.length;
    for (var i = 0; i < length; i++) {
        if (haystack[i] == needle) return true;
    } // for
    return false;
} // in_array

// POST data: req.body.variable_name

router.use(function(req, res, next) {
	req.sys_logger.write('csilla', 'debug');
	// Jogosultság ellenőrzése, ha ok, akkor next(), különben "access denied" 403
	// [Authorization] => key=titkos
	// res.sendStatus(403);
	next();
});

// Messages
// Read incoming messages
router.route('/messages')
	.get(function(req, res, next) {
		res.send('üzenetek listája');
	});

// Send new message
router.route('/message')
	.put(function(req, res, next) {
		res.send('új üzenet küldése');
	});

router.route('/message/:id')
	.get(function(req, res, next) { // Read a message by id
		res.send('egy üzenet');
	})
	.delete(function(req, res, next) { // Delete a message by id
		res.send('üzenet törlése')
	});

// Tweets
// read
router.route('/statuses')
	.get(function(req, res, next) {
		res.send('tweetek listája'); // saját és követett felhasználók
	});

// tweeting
router.route('/status')
	.put(function(req, res, next) {
		res.send('új tweet');
	});

module.exports = router;
