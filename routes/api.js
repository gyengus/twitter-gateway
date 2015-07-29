var api = {};

// Messages
// Read incoming messages
api.getMessages = function(req, res, next) {
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
			var out = {};
			out.messages = msg;
			res.json(out);
		}
	});
};

// Send new message
// POST data: req.body.variable_name
api.newMessage = function(req, res, next) {
	var text = req.context.text;
	var to = req.context.to;
	if (text && to) {
		req.twitter_client.post('direct_messages/new', {screen_name: to, text: text}, function sendMessage(error, message, response) {
			if (error) {
				if (req.DEVMODE) console.log(error);
				req.sys_logger.write('Error on send message: ' + error[0].code + '; ' + error[0].message + '\nReceipent: ' + to + '\nText: ' + text, 'error');
				res.sendStatus(500);
			} else {
				if (req.pmx) {
					req.messageCounter.inc();
				}
				res.json('{"id": ' + message.id + '}');
			}
		});
	} else {
		// hiányzó adatok
		res.sendStatus(400);
	}
};

api.getMessage = function(req, res, next) { // Read a message by id
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
			var out = {};
			out.message = tmp;
			res.json(out);
		}
	});
};
api.delMessage = function(req, res, next) { // Delete a message by id
	req.twitter_client.post('direct_messages/destroy', {id: req.params.id, include_entities: false}, function(error, message, response) {
		if (error) {
			if (req.DEVMODE) console.log(error);
			req.sys_logger.write('Error on delete message: ' + error[0].code + '; ' + error[0].message + '\n', 'error');
			res.sendStatus(500);
		} else {
			res.sendStatus(200);
		}
	});
};

// Tweets
// read
api.getStatuses = function(req, res, next) {
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
			var out = {};
			out.statuses = msg;
			res.json(out);
		}
	});
};

// tweeting
api.newStatus = function(req, res, next) {
	var text = req.body.text;
	if (text) {
		req.twitter_client.post('statuses/update', {status: text}, function(error, tweet, response) {
			if (error) {
				if (req.DEVMODE) console.log(error);
				req.sys_logger.write('Error on send tweet: ' + error[0].code + '; ' + error[0].message + '\nReceipent: ' + to + '\nText: ' + text, 'error');
				res.sendStatus(500);
			} else {
				if (req.pmx) {
					req.tweetCounter.inc();
				}
				res.json('{"id": ' + tweet.id_str + '}');
			}
		});
	} else {
		res.sendStatus(400);
	}
};

api.delStatus = function(req, res, next) { // Delete a message by id
	req.twitter_client.post('statuses/destroy/' + req.params.id, {trim_user: true}, function(error, tweet, response) {
		if (error) {
			if (req.DEVMODE) console.log(error);
			req.sys_logger.write('Error on delete tweet: ' + error[0].code + '; ' + error[0].message + '\n', 'error');
			res.sendStatus(500);
		} else {
			res.sendStatus(200);
		}
	});
};

module.exports = api;
