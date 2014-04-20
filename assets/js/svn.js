angular.module('Clockdoc.Utils')
.factory('Svn', ['$q', function($q) {

	var nativeSvnApp = 'com.clockwork.svn';
	var svnRoot = 'svn+ssh://svn.pozitronic.com/svnroot';

	var listeners = {
		'error'     : [],
		'cancel'    : [],
		'executing' : [],
		'read'      : [],
		'checkout'  : [],
		'info'      : [],
		'commit'    : [],
		'update'    : []
	};

	return {
		on: function(events, callback) {
			var events = events.split(' ');
			events.forEach(function(event) {
				listeners[event].push(callback);
			});
		},

		fire: function(event) {
			if (!listeners[event]) {
				console.warn('Undefined event', event);
				return;
			}

			var args = Array.prototype.splice.call(arguments, 1);
			var self = this;
			listeners[event].forEach(function(callback) {
				// Wrapped in timeout to ensure asynchronous firing
				setTimeout(function() {
					callback.apply(self, args);
				}, 0);
			});
		},

		info: function(svnPath) {
			var self = this;
			var args = ['svn', 'info', svnPath];
			return self.exec(args).then(function(response) {
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
				self.fire('info', values);
			}, function(e) {
				self.fire('error', e);
			});
		},

		resolveWithInfo: function(svnPath, event, response) {
			var self = this;
			var text = angular.fromJson(response);
			var result = {
				content: text && text.response,
				path: svnPath
			};
			// Add info to the checkout
			self.info(svnPath).then(function(values) {
				result.info = values;
				self.fire(event, result);
			}, function(e) {
				self.fire('error', e);
			});
		},

		// svn+ssh://svn.pozitronic.com/svnroot/templates/rd-rd.json
		open: function(svnPath) {
			var self = this;
			var args = ['svn', 'cat', svnPath];
			return self.exec(args).then(function(response) {
				self.resolveWithInfo(svnPath, 'read', response);
			},
			function(e) {
				self.fire('error', e);
			});
		},

		// Allows the user to checkout a file. The callback
		// receives the contents, path, file entry and svn info
		checkout: function(svnPath) {
			var self = this,
				path = svnPath.replace(svnRoot, ''),
				dir = path.replace(/\\/g, '/').replace(/\/[^\/]*\/?$/, ''),
				file = path.split('/').reverse()[0];

			var run = function(args) {
				return function(response) {
					self.exec(args);
				}
			}
			
			var err = function(e) {
				self.fire('error', e);
			}

			return self.exec(['rm', '-rf', '.' + dir], err)
			.then(run(['svn', 'co', '--depth=empty', svnRoot + dir]), err)
			.then(run(['svn', 'up', '--depth=empty', '.' + dir + '/' + file]), err)
			.then(run(['cat', '.' + dir + '/' + file]), err)
			.then(function(response) {
				self.resolveWithInfo(svnPath, 'checkout', response);
			}, err);
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
			var self = this;
			return self.exec(args).then(function(response) {
				self.fire('commit', response);
				console.log("committed!", response);
			});
		},

		// Queues up the execution of a command and returns a promise
		exec: function(args) {
			var deferred = $q.defer();
			var self     = this;

			self.fire('executing', args);

			var resolveResponse = function(response) {
				if (chrome.runtime.lastError) {
					deferred.reject(chrome.runtime.lastError);
				}
				deferred.resolve(response);
			};

			chrome.runtime.sendNativeMessage(
				nativeSvnApp, 
				{ command: args },
				resolveResponse
			);

			return deferred.promise;
		}
	};
}]);
