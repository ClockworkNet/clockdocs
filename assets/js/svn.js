angular.module('Clockdoc.Utils')
.factory('Svn', function() {

	var listeners = {
		'error'   : [],
		'cancel'  : [],
		'exec'    : [],
		'read'    : [],
		'commit'  : [],
		'update'  : []
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

		//svn+ssh://svn.pozitronic.com/svnroot/templates/rd-rd.json
		open: function(svnPath, callback) {
			var self = this;
			self.exec(['svn', 'cat', svnPath], function(response) {
				console.log('received', response);
				var text = angular.fromJson(response);
				var result = {
					content: text && text.response,
					path: svnPath
				};
				if (callback) callback.call(self, result);
				self.fire('read', result);
			});
		},

		exec: function(args, callback) {
			var self = this;
			self.fire('exec', args);
			chrome.runtime.sendNativeMessage(
				'com.clockwork.svn',
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
