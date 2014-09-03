/*global angular:false */
'use strict';

angular.module('Clockdoc.Utils')
.factory('FileSystem', ['$q', function($q) {

	function checkError(deferred) {
		if (chrome.runtime.lastError) {
			deferred.reject(chrome.runtime.lastError);
			return true;
		}
		return false;
	}

	return {
		read: function(result, readMethod) {
			var deferred = $q.defer();

			if (!result || !result.entry || !result.entry.isFile) {
				deferred.resolve(result);
				return deferred.promise;
			}

			var reader = new FileReader();

			reader.onerror = function(e) {
				return deferred.reject(e);
			};

			reader.onload = function(event) {
				result.event   = event;
				result.content = reader.result;
				return deferred.resolve(result);
			};

			readMethod = readMethod || 'readAsText';

			result.entry.file(function(file) {
				reader[readMethod](file);
			}, function(e) {
				return deferred.reject(e);
			});

			return deferred.promise;
		},

		openFile: function(extensions, readOnly) {
			var type = readOnly ? 'openFile' : 'openWritableFile';
			var opts = {
				type: type,
				accepts: [{extensions: extensions}]
			};
			opts.accepts = [{extensions: extensions}];
			return this.open(opts);
		},

		openFiles: function(extensions) {
			var opts = {
				type: 'openWritableFile',
				accepts: [{extensions: extensions}],
				acceptsMultiple: true
			};
			opts.accepts = [{extensions: extensions}];
			return this.open(opts, true);
		},

		openDirectory: function() {
			var opts = {
				type: 'openDirectory'
			};
			return this.open(opts);
		},

		open: function(options, expectMultiple) {
			var deferred = $q.defer();
			var self = this;

			options = options || {};

			if (!options.type) {
				options.type = 'openWritableFile';
			}

			var onOpen = function(entries) {
				if (checkError(deferred)) {
					return;
				}

				if (!entries || entries.length < 1) {
					return deferred.resolve(null);
				}

				entries = Array.isArray(entries) ? entries : [entries];
				var results = [];

				entries.forEach(function(entry) {
					var entryId = chrome.fileSystem.retainEntry(entry);
					var result = {
						entry: entry,
						entryId: entryId
					};
					self.getDisplayPath(entry)
					.then(function(path) {
						result.displayPath = path;
					});
					results.push(result);
				});

				if (!expectMultiple) {
					results = results[0];
				}

				deferred.resolve(results);
			};

			chrome.fileSystem.chooseEntry(options, onOpen);

			return deferred.promise;
		},

		restore: function(entryId) {
			var deferred = $q.defer();
			var self = this;
			var onRestore = function(entry) {
				if (checkError(deferred)) {
					return;
				}

				var result = {
					entry: entry,
					entryId: entryId
				};
				self.getDisplayPath(entry)
				.then(function(path) {
					result.displayPath = path;
				});

				deferred.resolve(result);
			};

			chrome.fileSystem.restoreEntry(entryId, onRestore);

			return deferred.promise;
		},

		getDisplayPath: function(entry) {
			var deferred = $q.defer();
			chrome.fileSystem.getDisplayPath(entry, function(displayPath) {
				deferred.resolve(displayPath);
			});
			return deferred.promise;
		},

		write: function(entry, data, type) {
			var deferred = $q.defer();

			if (!entry) {
				deferred.resolve(null);
				return deferred.promise;
			}

			type = type || 'text/plain';

			var loggedError = false;
			var onError = function(e) {
				if (!loggedError) {
					console.error('Error writing file', e);
					loggedError = true;
				}
				deferred.reject(e);
			};

			var startWrite = function() {
				var writer = this;
				writer.onwriteend = function() {
					var entryId = chrome.fileSystem.retainEntry(entry);
					var result = {
						writer: writer,
						content: data,
						entry: entry,
						entryId: entryId
					};
					if (checkError(deferred)) {
						return;
					}
					deferred.resolve(result);
				};
				writer.write(new Blob([data], {type: type}));
			};

			entry.createWriter(function(writer) {
				writer.onerror    = onError;
				writer.onwriteend = startWrite;
				writer.truncate(0);
			}, onError);

			return deferred.promise;
		},

		save: function(entryId, data, type) {
			var self = this;
			var deferred = $q.defer();
			chrome.fileSystem.restoreEntry(entryId, function(entry) {
				if (checkError(deferred)) {
					return;
				}
				self.write(entry, data, type)
				.then(function(result) {
					deferred.resolve(result);
				}, function(e) {
					deferred.reject(e);
				});
			});
			return deferred.promise;
		},

		saveAs: function (filename, extension, data, type) {
			var self = this;
			var deferred = $q.defer();
			var args = {
				type: 'saveFile',
				suggestedName: filename,
				accepts: [{extensions: [extension]}]
			};
			chrome.fileSystem.chooseEntry(args, function(entry) {
				self.write(entry, data, type)
				.then(function(result) {
					deferred.resolve(result);
				}, function(e) {
					deferred.reject(e);
				});
			});
			return deferred.promise;
		}
	};

}]);
