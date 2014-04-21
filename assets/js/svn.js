angular.module('Clockdoc.Utils')
.factory('Svn', ['$q', 'FileSystem', function($q, FileSystem) {

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

		parseInfo: function(response) {
			var data = angular.fromJson(response);
			var info = data.response;
			var lines = info.split('\n');
			var values = {};
			lines.forEach(function(line) {
				var colon = line.indexOf(':');
				var key = line.substr(0, colon).trim();
				var value = line.substr(colon + 1).trim();
				if (key && key.length) {
					values[key] = value;
				}
			});
			return values;
		},

		info: function(svnPath) {
			var self = this;
			var args = ['svn', 'info', svnPath];

			return self.exec(args)
			.then(function(response) {
				var values = self.parseInfo(response);
				self.fire('info', values);
			})
			.catch(function(e) {
				self.fire('error', e);
			});
		},

		fireWithInfo: function(event, result) {
			var self = this;
			var args = ['svn', 'info', result.path];
			// Add info to the checkout
			return self.exec(args)
			.then(function(response) {
				result.svn = self.parseInfo(response);
				self.fire(event, result);
			})
			.catch(function(e) {
				self.fire('error', e);
			});
		},

		// svn+ssh://svn.pozitronic.com/svnroot/templates/rd-rd.json
		open: function(svnPath) {
			var self = this;
			var args = ['svn', 'cat', svnPath];
			return self.exec(args)
			.then(function(response) {
				var text = angular.fromJson(response);
				var result = {
					content: text && text.response,
					path: svnPath
				};
				return self.fireWithInfo('read', result);
			})
			.catch(function(e) {
				self.fire('error', e);
			});
		},

		// Allows the user to checkout a file. The callback
		// receives the contents, path, file entry and svn info
		checkout: function(svnPath) {
			var self = this,
				path = svnPath.replace(svnRoot, ''),
				svnDir = svnPath.substr(0, svnPath.lastIndexOf('/')),
				svnFile = path.split('/').reverse()[0];

			return FileSystem.open()
			.then(function(localDir) {

				console.log("Selected directory", localDir);
				if (!localDir || !localDir.entry) {
					return self.fire('cancel');
				}

				var run = function(args) {
					return function(response) {
						return self.exec(args);
					}
				}

				var localDirPath = localDir.displayPath + '/';
				var localFilePath = localDirPath + svnFile;

				return self.exec(['svn', 'co', '--depth=empty', svnDir, localDirPath])
				.then(run(['svn', 'up', localFilePath]))
				.then(run(['cat', localFilePath]))
				.then(function(response) {
					var text = angular.fromJson(response);
					var result = {
						content: text && text.response,
						path: svnPath,
						localPath: localFilePath,
						dir: localDir.entry,
						dirId: localDir.entryId
					};
					console.log('trying to get file', svnFile);
					localDir.entry.getFile(svnFile, {create: true}, function(entry) {
						result.entry = entry;
						self.fireWithInfo('checkout', result);
					}, function(e) {
						self.fire('error', e);
					});
				})
				.catch(function(e) {
					self.fire('error', e);
				});
			});
		},

		// Commits changes made to a checkout. Uses the 'result' object
		// returned by a checkout
		commit: function(result) {
			if (!result.svn || !result.svn.Message) {
				self.fire('error', new Error('Commits require a message'));
				return;
			}
			if (!result.entry || !result.localPath) {
				self.fire('error', new Error('Local path not found'));
				return;
			}
			var self = this;
			return FileSystem.write(result.entry, result.content)
			.then(function(rsp) {
				var message = result.svn.Message;
				self.exec(['svn', 'ci', result.localPath, '-m', message])
				.then(function(response) {
					console.log("committed!", response);
					self.fire('commit', response);
				}).
				catch(function(e) {
					self.fire('error', e);
				});
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

			console.log('Svn.exec:', args);
			chrome.runtime.sendNativeMessage(
				nativeSvnApp, 
				{ command: args },
				resolveResponse
			);

			return deferred.promise;
		}
	};
}]);
