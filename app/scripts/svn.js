/*global angular:false */
'use strict';

angular.module('Clockdoc.Utils')
.factory('Svn', ['$q', 'FileSystem', 'File', function($q, FileSystem, File) {

	function Svn(root) {
		this.nativeSvnApp = 'com.clockwork.svn';
		this.root = root || 'svn+ssh://svn.pozitronic.com/svnroot';
	}

	Svn.prototype.install = function() {
		var deferred = $q.defer();
		var filename = this.nativeSvnApp + '.json';
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
	};

	Svn.prototype.test = function() {
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
	};

	Svn.prototype.parseInfo = function(response) {
		var data = angular.fromJson(response);
		var info = data.response;
		var lines = info.split('\n');
		var values = {};
		lines.forEach(function(line) {
			var colon = line.indexOf(':');
			var key = line.substr(0, colon).trim();
			var value = line.substr(colon + 1).trim();
			if (key && key.length) {
				// camelCase
				key = key.toLowerCase().replace(/[ -](.)/gi, function(a, m) {
					return m.toUpperCase();
				});
				values[key] = value;
			}
		});
		return values;
	};

	Svn.prototype.info = function(svnPath) {
		var self = this,
			args = ['svn', 'info', svnPath],
			deferred = $q.defer();

		self.exec(args)
		.then(function(response) {
			var values = self.parseInfo(response);
			deferred.resolve(values);
		}, deferred.reject.bind(self));

		return deferred.promise;
	};

	Svn.prototype.open = function(svnPath) {
		var self = this;
		var args = ['svn', 'cat', svnPath];
		return self.exec(args)
		.then(function(response) {
			var file = new File();
			file.content = self.getContentFromResponse(response);
			file.remote = new File.Location(svnPath);
			return file;
		});
	};

	Svn.prototype.getContentFromResponse = function(response) {
		if (!response) {
			return null;
		}
		var data = angular.fromJson(response);
		if (!data) {
			return null;
		}
		return data.response;
	};

	/* Updates a file from SVN */
	Svn.prototype.update = function(svnResult) {
		var self = this;
		var upArgs = ['svn', 'up', svnResult.local.full];
		var catArgs = ['cat', svnResult.local.full];
		var deferred = $q.defer();

		self.exec(upArgs)
		.then(function(response) {
			if (!response) {
				console.error('No response after updating');
				deferred.reject();
			}
			self.exec(catArgs)
			.then(function(response) {
				var result = new File();
				result.content = self.getContentFromResponse(response);
				result.remote = svnResult.remote;
				result.local = svnResult.local;

				// If the update was called on the file itself, just return it
				if (svnResult.entry.isFile) {
					return deferred.resolve(result);
				}

				// Otherwise the update was called on the parent directory. Get a reference to the
				// FileEntry and set it on the result before returning
				svnResult.entry.getFile(svnResult.local.file, {create: false}, function(entry) {
					result.entry = entry;
					deferred.resolve(result);
				}, function(e) {
					deferred.reject(e);
				});
			});
		});

		return deferred.promise;
	};

	// Allows the user to checkout a file. The callback
	// receives the contents, path, file entry and svn info
	Svn.prototype.checkout = function(svnPath) {
		var self = this,
			svnLocation = new File.Location(svnPath),
			deferred = $q.defer();

		FileSystem.openDirectory()
		.then(function(localDir) {

			console.log('Selected directory', localDir);
			if (!localDir || !localDir.entry) {
				deferred.reject();
			}

			var localLocation = new File.Location();

			var run = function(args) {
				return function() {
					return self.exec(args);
				};
			};

			var fail = function(e) {
				deferred.reject(e);
			};

			// Stores the extensive steps required for an initial checkout
			var checkout = function() {
				// We have the display path, now chaing together SVN calls
				self.exec(['svn', 'co', '--depth=empty', svnLocation.dir, localLocation.dir])
				.then(run(['svn', 'up', localLocation.full]))
				.then(run(['cat', localLocation.full]))
				.then(function(response) {
					var result = new File();
					result.content = self.getContentFromResponse(response);
					result.remote = svnLocation;
					result.local = localLocation;
					console.log('trying to get file from svn result', result);

					localDir.entry.getFile(localLocation.file, {create: false}, function(entry) {
						result.entry = entry;
						deferred.resolve(result);
					}, function(e) {
						deferred.reject(e);
					});
				})
				.catch(fail);
			};

			var update = function() {
				var result = new File();
				result.entry = localDir.entry;
				result.remote = svnLocation;
				result.local = localLocation;

				self.update(result)
				.then(function(result) {
					deferred.resolve(result);
				});
			};

			// Get the display path of the local directory
			FileSystem.getDisplayPath(localDir.entry)
			.then(function(displayPath) {
				// The display path typically has a "~" indication 
				// for the home directory. We need to get the real home
				// first and replace it
				displayPath += '/';
				if (displayPath[0] === '~') {
					displayPath = '.' + displayPath.substring(1);
				}
				displayPath += svnLocation.file;
				localLocation = new File.Location(displayPath);
			})
			// Then test the directory to see if it's already a checkout.
			.then(self.info.bind(self, svnPath))
			.then(function(info) {
				// If it is, run an update instead and then return the result.
				if (info && info.revision) {
					update();
				}
				// Otherwise, perform the checkout.
				else {
					checkout();
				}
			});
		});

		return deferred.promise;
	};

	// Commits changes made to a checkout. Uses the 'result' object
	// returned by a checkout
	Svn.prototype.commit = function(svnResult, message) {
		var self = this,
			deferred = $q.defer(),
			valid = true;

		if (!message) {
			valid = false;
			deferred.reject(new Error('Commits require a message'));
		}

		if (!svnResult.entry || !svnResult.local) {
			valid = false;
			deferred.reject(new Error('Local path not found'));
		}

		if (valid) {
			FileSystem.write(svnResult.entry, svnResult.content)
			.then(function() {
				self.exec(['svn', 'ci', svnResult.local.full, '-m', message])
				.then(function(svnResponse) {
					console.log('committed!', svnResponse);
					deferred.resolve(svnResult);
				}, deferred.reject.bind(this));
			});
		}

		return deferred.promise;
	};

	// Queues up the execution of a command and returns a promise
	Svn.prototype.exec = function(args) {
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
				this.nativeSvnApp,
				{ command: args },
				resolveResponse
			);
		}
		catch (e) {
			deferred.reject(e);
		}

		return deferred.promise;
	};

	return new Svn();
}]);
