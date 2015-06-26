var _ = require('lodash');
var fs = require('fs');

module.exports = {
	baseFolder: __dirname + '/../',

	setBaseFolder: function(baseFolder) {
		this.baseFolder = baseFolder;
		return this;
	},

	load: function() {
		var conf = JSON.parse(fs.readFileSync(this.baseFolder + 'config.def.json', 'utf8'));

		try {
			var overrides = JSON.parse(fs.readFileSync(this.baseFolder + 'config.json', 'utf8'));
			if (overrides) {
				_.merge(conf, overrides);
			}
		} catch(err) {
		}

		return conf;
	}
};

