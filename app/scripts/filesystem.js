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

	function FileSystemResult(entry, entryId) {
		this.entry = entry;
		if (entry && entryId) {
			this.entry.entryId = entryId;
		}
		this.event = null;
		this.content = null;
	}

	Object.defineProperty(FileSystemResult.prototype, 'entryId', {
		get: function() {
			if (!this.entry) {
				return null;
			}
			if (!this.entry.entryId) {
				this.entry.entryId = chrome.fileSystem.retainEntry(this.entry);
			}
			return this.entry.entryId;
		},
		set: function(id) {
			if (!this.entry) {
				this.entry = {};
			}
			this.entry.entryId = id;
		}
	});

	FileSystemResult.prototype.getDisplayPath = function() {
		var deferred = $q.defer();
		chrome.fileSystem.getDisplayPath(this.entry, function(displayPath) {
			if (checkError(deferred)) {
				return;
			}
			deferred.resolve(displayPath);
		});
		return deferred.promise;
	};

	return {
		Result: FileSystemResult,
		MESSAGE_USER_CANCELLED: 'User cancelled',

		/*
		 * Reads the contents of a FileSystemResult and populates
		 * the 'content' and 'event' values on the object
		 */
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

		/* 
		 * Creates a file open prompt and returns a promise for
		 * the FileSystemResult object that may be returned.
		 */
		openFile: function(extensions, readOnly) {
			var type = readOnly ? 'openFile' : 'openWritableFile';
			var opts = {
				type: type,
				accepts: [{extensions: extensions}]
			};
			opts.accepts = [{extensions: extensions}];
			return this.open(opts);
		},

		/*
		 * Creates a file open prompt for multiple files
		 * and returns a promise to get the FileSystemResult array.
		 */
		openFiles: function(extensions) {
			var opts = {
				type: 'openWritableFile',
				accepts: [{extensions: extensions}],
				acceptsMultiple: true
			};
			opts.accepts = [{extensions: extensions}];
			return this.open(opts, true);
		},

		/*
		 * Creates a directory open prompt and returns
		 * the promise to get the FileSystemResult returned.
		 */
		openDirectory: function() {
			var opts = {
				type: 'openDirectory'
			};
			return this.open(opts);
		},

		/*
		 * A generic 'open' method that gets passed to 
		 * chrome.fileSystem.chooseEntry and then processes
		 * the responses as FileSystemResult objects.
		 * Returns a promise.
		 */
		open: function(options, expectMultiple) {
			var deferred = $q.defer();

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
					var result = new FileSystemResult(entry);
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

		/*
		 * Attempts to restore a FileSystemResult based on a saved
		 * entryId. Returns a promise for the FileSystemResult.
		 */
		restore: function(entryId) {
			var deferred = $q.defer();
			var onRestore = function(entry) {
				if (checkError(deferred)) {
					return;
				}
				var result = new FileSystemResult(entry, entryId);
				deferred.resolve(result);
			};

			chrome.fileSystem.restoreEntry(entryId, onRestore);

			return deferred.promise;
		},

		/* 
		 * Writes data to a file and returns a FileSystemResult object 
		 */
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
					var result = new FileSystemResult(entry);
					result.writer = writer;
					result.content = data;

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

		/* 
		 * Saves data to the specified entryId using the 'write' method 
		 */
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

		/*
		 * Creates a save-as dialog and returns a promise
		 * for the FileSystemResult.
		 */
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
					if (result) {
						deferred.resolve(result);
					}
					else {
						deferred.reject(null);
					}
				}, function(e) {
					deferred.reject(e);
				});
			});
			return deferred.promise;
		}
	};

}]);
