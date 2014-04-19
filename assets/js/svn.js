angular.module('Clockdoc.Utils')
.factory('Svn', function() {

	var nativeSvnApp = 'com.clockwork.svn';

	var listeners = {
		'error'     : [],
		'cancel'    : [],
		'executing' : [],
		'read'      : [],
		'info'      : [],
		'commit'    : [],
		'update'    : []
	};

	return {
		on: function(event, callback) {
			listeners[event].push(callback);
		},

		fire: function(event) {
			var args = Array.prototype.splice.call(arguments, 1);
			var self = this;
			listeners[event].forEach(function(callback) {
				callback.apply(self, args);
			});
		},

		info: function(svnPath, callback) {
			var self = this;
			self.exec(['svn', 'info', svnPath], function(response) {
				var data = angular.fromJson(response);
				var info = data.response;
				var lines = info.split('\n');
				var values = {};
				lines.forEach(function(line) {
					var colon = line.indexOf(':');
					var key = line.substr(0, colon).trim();
					var value = line.substr(colon + 1).trim();
					values[key] = value;
				});
				if (callback) callback.call(self, values);
				self.fire('info', values);
			});
		},

		// svn+ssh://svn.pozitronic.com/svnroot/templates/rd-rd.json
		open: function(svnPath, callback) {
			var self = this;
			self.exec(['svn', 'cat', svnPath], function(response) {
				var text = angular.fromJson(response);
				var result = {
					content: text && text.response,
					path: svnPath
				};
				// Add info to the checkout
				self.info(svnPath, function(values) {
					result.info = values;
					if (callback) callback.call(self, result);
					self.fire('read', result);
				});
			});
		},

		commit: function(data, info) {
			var args = [
				'echo', angular.toJson(data), '|', // Pipe the file contents to svnmucc
				'svnmucc',
				'-r', info['Revision'], // Include revision # to prevent clobbering a newer version
				'put', '-', // Use '-' to indicate using STDIN
				info.URL,
				'-m', info['Message']
			];
			console.log('would be committing with this:', args);
			// see svnmucc for details
			// svnmucc -r 14 put README.tmpfile ://svn.example.com/projects/sandbox/README -m "Tweak the README file."
		},

		exec: function(args, callback) {
			console.trace('exec', args);
			var self = this;
			self.fire('executing', args);
			chrome.runtime.sendNativeMessage(
				nativeSvnApp,
				{ command: args },
				function(response) {
					if (chrome.runtime.lastError) {
						console.log('error running svn command', args, chrome.runtime.lastError);
						self.fire('error', chrome.runtime.lastError);
						return;
					}
					console.log("response", arguments);
					callback(response);
				}
			);
		}


	};
});
