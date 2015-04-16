var express = require('express');
var router = express.Router();

router.use(function(req, res, next) {
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
		req.twitter_client.get('direct_messages', {skip_status: true, include_entities: false}, function(error, messages, response) {
			if (error) {
				if (req.DEVMODE) console.log(error);
				req.sys_logger.write('Error on reading messages: ' + error[0].code + '; ' + error[0].message + '\n', 'error');
				res.sendStatus(500);
			} else {
				var msg = [];
				for (var i = 0; i < messages.length; i++) {
					var tmp = {};
					tmp.id = messages[i].id_str;
					tmp.created_at = messages[i].created_at;
					tmp.text = messages[i].text;
					tmp.sender_screen_name = messages[i].sender_screen_name;
					tmp.sender_id = messages[i].sender.id;
					tmp.sender_name = messages[i].sender.name;
					msg.push(tmp);
				} // for
				res.json(JSON.stringify(msg));
			}
		});
	});

// Send new message
// POST data: req.body.variable_name
router.route('/message')
	.put(function(req, res, next) {
		var text = req.body.text;
		var to = req.body.to;
		if (text && to) {
			req.twitter_client.post('direct_messages/new', {screen_name: to, text: text}, function(error, message, response) {
				if (error) {
					if (req.DEVMODE) console.log(error);
					req.sys_logger.write('Error on send message: ' + error[0].code + '; ' + error[0].message + '\nReceipent: ' + to + '\nText: ' + text, 'error');
					res.sendStatus(500);
				} else {
					res.json('{"id": ' + message.id + '}');
				}
			});
		} else {
			// hiányzó adatok
			res.sendStatus(400);
		}
	});

router.route('/message/:id')
	.get(function(req, res, next) { // Read a message by id
		req.twitter_client.get('direct_messages/show', {id: req.params.id}, function(error, message, response) {
			if (error) {
				if (req.DEVMODE) console.log(error);
				req.sys_logger.write('Error on get the message: ' + error[0].code + '; ' + error[0].message + '\nId: ' + req.params.id, 'error');
				res.sendStatus(500);
			} else {
				var tmp = {};
				tmp.id = message.id_str;
				tmp.created_at = message.created_at;
				tmp.text = message.text;
				tmp.sender_screen_name = message.sender_screen_name;
				tmp.sender_id = message.sender.id;
				tmp.sender_name = message.sender.name;
				res.json(JSON.stringify(tmp));
			}
		});
	})
	.delete(function(req, res, next) { // Delete a message by id
		req.twitter_client.post('direct_messages/destroy', {id: req.params.id, include_entities: false}, function(error, message, response) {
			if (error) {
				if (req.DEVMODE) console.log(error);
				req.sys_logger.write('Error on delete message: ' + error[0].code + '; ' + error[0].message + '\n', 'error');
				res.sendStatus(500);
			} else {
				res.sendStatus(200);
			}
		});
	});

// Tweets
// read
router.route('/statuses')
	.get(function(req, res, next) {
		req.twitter_client.get('statuses/home_timeline', {trim_user: 1}, function(error, tweets, response) {
			if (error) {
				if (req.DEVMODE) console.log(error);
				req.sys_logger.write('Error on reading timeline: ' + error[0].code + '; ' + error[0].message + '\n', 'error');
				res.sendStatus(500);
			} else {
				var msg = [];
				for (var i = 0; i < tweets.length; i++) {
					var tmp = {};
					tmp.created_at = tweets[i].created_at;
					tmp.id = tweets[i].id_str;
					tmp.text = tweets[i].text;
					//tmp.coordinates = tweets[i].coordinates.coordinates;
					tmp.user_name = tweets[i].user.name;
					tmp.user_id_str = tweets[i].user.id_str;
					tmp.user_location = tweets[i].user.location;
					tmp.user_profile_image_url = tweets[i].user.profile_image_url;
					msg.push(tmp);
				} // for
				res.json(JSON.stringify(msg));
			}
		});
	});

// tweeting
router.route('/status')
	.put(function(req, res, next) {
		var text = req.body.text;
		if (text) {
			req.twitter_client.post('statuses/update', {status: text}, function(error, tweet, response) {
				if (error) {
					if (req.DEVMODE) console.log(error);
					req.sys_logger.write('Error on send tweet: ' + error[0].code + '; ' + error[0].message + '\nReceipent: ' + to + '\nText: ' + text, 'error');
					res.sendStatus(500);
				} else {
					res.json('{"id": ' + tweet.id_str + '}');
				}
			});
		} else {
			res.sendStatus(400);
		}
	});

router.route('/status/:id')
	.delete(function(req, res, next) { // Delete a message by id
		req.twitter_client.post('statuses/destroy/' + req.params.id, {trim_user: true}, function(error, tweet, response) {
			if (error) {
				if (req.DEVMODE) console.log(error);
				req.sys_logger.write('Error on delete tweet: ' + error[0].code + '; ' + error[0].message + '\n', 'error');
				res.sendStatus(500);
			} else {
				res.sendStatus(200);
			}
		});
	});

module.exports = router;
