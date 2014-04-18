angular.module('Clockdoc.Utils')
.factory('Svn', function() {

	var listeners = {
		'error'  : [],
		'cancel' : [],
		'checkout' : [],
		'commit'   : [],
		'update'   : []
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

		// Allows the user to checkout a file. The callback
		// receives the contents, file entry, and progress event
		checkout: function(svnPath, callback) {

			var self = this,
				svnRoot = 'svn+ssh://svn.pozitronic.com/svnroot',
				path = svnPath.replace(svnRoot, ''),
				dir = path.replace(/\\/g, '/').replace(/\/[^\/]*\/?$/, ''),
				file = path.split('/').reverse()[0];

			self.exec(
				["rm","-rf", "." + dir],
				function(response) {
					self.exec(
						["svn","co","--depth=empty", svnRoot + dir],
						function(response) {
							self.exec(
								["svn","up","--depth=empty", "." + dir + "/" + file],
								function(response) {
									self.exec(
										['cat', "." + dir + "/" + file],
										function(response) {
											callback.call(self, response.response);
										}
									);
								}
							);
						}
					);
				}
			);
			//svn+ssh://svn.pozitronic.com/svnroot/templates/rd-rd.json
		},

		exec: function(args, callback) {
			console.log("running");
			console.log(args);
			chrome.runtime.sendNativeMessage(
				'com.clockwork.svn',
				{ command: args },
				function(response) {
					console.log("response");
					console.log(response);
					callback(response);
				}
			);
		}


	};
});