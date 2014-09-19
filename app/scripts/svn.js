/*global angular:false */
'use strict';

angular.module('Clockdoc.Utils')
.factory('Svn', ['$q', 'FileSystem', function($q, FileSystem) {

	var nativeSvnApp = 'com.clockwork.svn';

	return {
		svnRoot: 'svn+ssh://svn.pozitronic.com/svnroot',

		install: function() {
			var deferred = $q.defer();
			var filename = nativeSvnApp + '.json';
			var self = this;

			var opts = {
				type: 'openWritableFile',
				accepts: [{extensions: ['json']}],
				suggestedName: filename
			};

			FileSystem.open(opts)
			.then(function(result) {
				FileSystem.read(result)
				.then(function(result) {
					if (!result) {
						return deferred.reject(null);
					}
					var manifest = angular.fromJson(result.content);
					/*jshint camelcase: false */
					if (!manifest.allowed_origins) {
						manifest.allowed_origins = [];
					}
					manifest.allowed_origins.push(chrome.runtime.getURL(''));
					/*jshint camelcase: true */
					var manifestText = angular.toJson(manifest, true);
					FileSystem.write(result.entry, manifestText)
						.then(deferred.resolve.bind(self), deferred.reject.bind(self));
				});
			});

			return deferred.promise;
		},

		test: function() {
			var deferred = $q.defer();

			this.exec(['pwd'])
			.then(function(res) {
				if (res) {
					deferred.resolve(res);
				}
				else {
					deferred.reject(res);
				}
			}, deferred.reject.bind(this));

			return deferred.promise;
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
			var self = this,
				args = ['svn', 'info', svnPath],
				deferred = $q.defer();

			self.exec(args)
			.then(function(response) {
				var values = self.parseInfo(response);
				deferred.resolve(values);
			}, deferred.reject.bind(self));

			return deferred.promise;
		},

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
				return result;
			});
		},

		// Allows the user to checkout a file. The callback
		// receives the contents, path, file entry and svn info
		checkout: function(svnPath) {
			var self = this,
				path = svnPath.replace(this.svnRoot, ''),
				svnDir = svnPath.substr(0, svnPath.lastIndexOf('/')),
				svnFile = path.split('/').reverse()[0],
				deferred = $q.defer();

			FileSystem.open()
			.then(function(localDir) {

				console.log('Selected directory', localDir);
				if (!localDir || !localDir.entry) {
					return null;
				}

				var run = function(args) {
					return function() {
						return self.exec(args);
					};
				};

				// The display path typically has a "~" indication 
				// for the home directory. We need to get the real home
				// first and replace it
				var localDirPath = localDir.displayPath + '/';
				if (localDirPath[0] === '~') {
					localDirPath = '.' + localDirPath.substring(1);
				}

				var localFilePath = localDirPath + svnFile;

				self.exec(['svn', 'co', '--depth=empty', svnDir, localDirPath])
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
					localDir.entry.getFile(svnFile, {create: false}, function(entry) {
						result.entry = entry;
						deferred.resolve(result);
					}, function(e) {
						deferred.reject(e);
					});
				});
			});

			return deferred.promise;
		},

		// Commits changes made to a checkout. Uses the 'result' object
		// returned by a checkout
		commit: function(result) {
			var self = this,
				deferred = $q.defer();

			if (!result.svn || !result.svn.Message) {
				deferred.reject(new Error('Commits require a message'));
			}
			if (!result.entry || !result.localPath) {
				deferred.reject(new Error('Local path not found'));
			}

			FileSystem.write(result.entry, result.content)
			.then(function(result) {
				var message = result.svn.Message;
				self.exec(['svn', 'ci', result.localPath, '-m', message])
				.then(function(response) {
					console.log('committed!', response);
					deferred.resolve(result);
				}, deferred.reject.bind(this));
			});

			return deferred.promise;
		},

		// Queues up the execution of a command and returns a promise
		exec: function(args) {
			var deferred = $q.defer();

			var resolveResponse = function(response) {
				if (chrome.runtime.lastError) {
					deferred.reject(chrome.runtime.lastError);
				}
				deferred.resolve(response);
			};

			try {
				console.info('executing', args);
				chrome.runtime.sendNativeMessage(
					nativeSvnApp,
					{ command: args },
					resolveResponse
				);
			}
			catch (e) {
				deferred.reject(e);
			}

			return deferred.promise;
		}
	};
}]);
