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
	// Jogosultság ellenőrzése, ha ok, akkor next(), különben "access denied" 403
	// [Authorization] => key=titkos
	// res.sendStatus(403);
	var i = 0;
	var x = req.CLIENTS.length;
	var key = req.headers.authorization;
	var client_ip = req.header('x-forwarded-for') || req.connection.remoteAddress;
	var authok = false;
	while (i < x) {
		if (key == 'key=' + req.CLIENTS[i].api_key) {
			authok = true;
			break;
		}
		i++;
	} // while
	if (authok) {
		req.sys_logger.write('Authorized access: ' + req.CLIENTS[i].name + '\nClient IP: ' + client_ip + '\nURL: ' + req.originalUrl + '\nHeaders: ' + JSON.stringify(req.headers), 'security');
		next();
	} else {
		req.sys_logger.write('Unauthorized access\nClient IP: ' + client_ip + '\nURL: ' + req.originalUrl + '\nHeaders: ' + JSON.stringify(req.headers), 'security');
		res.sendStatus(403);
	}
});

// Messages
// Read incoming messages
router.route('/messages')
	.get(function(req, res, next) {
		req.twitter_client.get('direct_messages', {skip_status: true, include_entities: false},  function(error, messages, response) {
			var msg = [];
			for (var i = 0; i < messages.length; i++) {
				var tmp = {};
				tmp.id = messages[i].id;
				tmp.created_at = messages[i].created_at;
				tmp.text = messages[i].text;
				tmp.sender_screen_name = messages[i].sender_screen_name;
				tmp.sender_id = messages[i].sender_id;
				tmp.sender_name = messages[i].sender.name;
				msg.push(tmp);
			} // for
			res.json(JSON.stringify(msg));
		});
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
		req.twitter_client.get('statuses/home_timeline', {trim_user: 1}, function(error, tweets, response) {
			var msg = [];
			for (var i = 0; i < tweets.length; i++) {
				var tmp = {};
				tmp.created_at = tweets[i].created_at;
				tmp.text = tweets[i].text;
				//tmp.coordinates = tweets[i].coordinates.coordinates;
				tmp.user_name = tweets[i].user.name;
				tmp.user_id_str = tweets[i].user.id_str;
				tmp.user_location = tweets[i].user.location;
				tmp.user_profile_image_url = tweets[i].user.profile_image_url;
				msg.push(tmp);
			} // for
			res.json(JSON.stringify(msg));
		});
	});

// tweeting
router.route('/status')
	.put(function(req, res, next) {
		res.send('új tweet');
	});

module.exports = router;
