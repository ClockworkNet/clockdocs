/*global angular:false */
'use strict';

angular.module('Clockdoc.Utils')
.factory('Svn', ['$q', 'FileSystem', function($q, FileSystem) {

	function Svn(root) {
		this.nativeSvnApp = 'com.clockwork.svn';
		this.root = root || 'svn+ssh://svn.pozitronic.com/svnroot';
	}

	function Location(fullPath) {
		this.full = fullPath;
		this.dir = fullPath && fullPath.substr(0, fullPath.lastIndexOf('/'));
		this.file = fullPath && fullPath.split('/').reverse()[0];
	}

	function Result(response, svnLocation, localLocation) {
		this.result = angular.fromJson(response);
		this.content = this.result && this.result.response;
		this.svnLocation = svnLocation;
		this.localLocation = localLocation;
	}

	// Svn.Result inherits from the FileSystem.Result
	Result.prototype = Object.create(FileSystem.Result.prototype, {
		constructor: {value: FileSystem.Result}
	});

	// Holds helpful information about a location
	Svn.Location = Location;

	// Stores the result of an SVN request
	Svn.Result = Result;

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
			return new Svn.Result(response, new Svn.Location(svnPath));
		});
	};

	/* Updates a file from SVN */
	Svn.prototype.update = function(svnResult) {
		var self = this;
		var upArgs = ['svn', 'up', svnResult.localLocation.full];
		var catArgs = ['cat', svnResult.localLocation.full];
		var deferred = $q.defer();

		self.exec(upArgs)
		.then(function(response) {
			if (!response) {
				console.error('No response after updating');
				deferred.reject();
			}
			self.exec(catArgs)
			.then(function(response) {
				var result = new Svn.Result(response, svnResult.svnLocation, svnResult.localLocation);
				deferred.resolve(result);
			});
		});

		return deferred.promise;
	};

	// Allows the user to checkout a file. The callback
	// receives the contents, path, file entry and svn info
	Svn.prototype.checkout = function(svnPath) {
		var self = this,
			svnLocation = new Svn.Location(svnPath),
			deferred = $q.defer();

		FileSystem.openDirectory()
		.then(function(localDir) {

			console.log('Selected directory', localDir);
			if (!localDir || !localDir.entry) {
				deferred.reject();
			}

			var localLocation = new Svn.Location();

			var run = function(args) {
				return function() {
					return self.exec(args);
				};
			};

			var fail = function(e) {
				deferred.reject(e);
			};

			localDir.getDisplayPath()
			.then(function(displayPath) {
				// The display path typically has a "~" indication 
				// for the home directory. We need to get the real home
				// first and replace it
				displayPath += '/';
				if (displayPath[0] === '~') {
					displayPath = '.' + displayPath.substring(1);
				}
				displayPath += svnLocation.file;
				localLocation = new Svn.Location(displayPath, localDir);
			})
			.then(function() {
				// We have the display path, now chaing together SVN calls
				self.exec(['svn', 'co', '--depth=empty', svnLocation.dir, localLocation.dir])
				.then(run(['svn', 'up', localLocation.full]))
				.then(run(['cat', localLocation.full]))
				.then(function(response) {
					var result = new Svn.Result(response, new Svn.Location(svnPath), localLocation);
					console.log('trying to get file from svn result', result);

					localDir.entry.getFile(localLocation.file, {create: false}, function(entry) {
						result.setEntry(entry);
						deferred.resolve(result);
					}, function(e) {
						deferred.reject(e);
					});
				})
				.catch(fail);
			}).catch(fail);
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

		if (!svnResult.entry || !svnResult.localLocation) {
			valid = false;
			deferred.reject(new Error('Local path not found'));
		}

		if (valid) {
			FileSystem.write(svnResult.entry, svnResult.content)
			.then(function() {
				self.exec(['svn', 'ci', svnResult.localLocation.full, '-m', message])
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
