/*global angular:false */
'use strict';

angular.module('Clockdoc.Utils')
.factory('FileSystem', ['$q', 'File', function($q, File) {

	function checkError(deferred) {
		if (chrome.runtime.lastError) {
			deferred.reject(chrome.runtime.lastError);
			return true;
		}
		return false;
	}

	function FileSystem() {
		this.MESSAGE_USER_CANCELLED = 'User cancelled';
	}

	/*
	 * Saves a reference to the entry for later.
	 */
	FileSystem.prototype.retain = function(entry) {
		return chrome.fileSystem.retainEntry(entry);
	};

	/*
	 * Gets the display path for an entry
	 */
	FileSystem.prototype.getDisplayPath = function(entry) {
		var deferred = $q.defer();
		chrome.fileSystem.getDisplayPath(entry, function(displayPath) {
			if (checkError(deferred)) {
				return;
			}
			deferred.resolve(displayPath);
		});
		return deferred.promise;
	};

	/*
	 * Reads the contents of a File and populates
	 * the 'content' and 'event' values on the object
	 */
	FileSystem.prototype.read = function(result, readMethod) {
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
	};

	/* 
	 * Creates a file open prompt and returns a promise for
	 * the File object that may be returned.
	 */
	FileSystem.prototype.openFile = function(extensions, readOnly) {
		var type = readOnly ? 'openFile' : 'openWritableFile';
		var opts = {
			type: type,
			accepts: [{extensions: extensions}]
		};
		opts.accepts = [{extensions: extensions}];
		return this.open(opts);
	};

	/*
	 * Creates a file open prompt for multiple files
	 * and returns a promise to get the File array.
	 */
	FileSystem.prototype.openFiles = function(extensions) {
		var opts = {
			type: 'openWritableFile',
			accepts: [{extensions: extensions}],
			acceptsMultiple: true
		};
		opts.accepts = [{extensions: extensions}];
		return this.open(opts, true);
	};

	/*
	 * Creates a directory open prompt and returns
	 * the promise to get the File returned.
	 */
	FileSystem.prototype.openDirectory = function() {
		var opts = {
			type: 'openDirectory'
		};
		return this.open(opts);
	};

	/*
	 * A generic 'open' method that gets passed to 
	 * chrome.fileSystem.chooseEntry and then processes
	 * the responses as File objects.
	 * Returns a promise.
	 */
	FileSystem.prototype.open = function(options, expectMultiple) {
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
				var result = new File(entry);
				results.push(result);
			});

			if (!expectMultiple) {
				results = results[0];
			}

			deferred.resolve(results);
		};

		chrome.fileSystem.chooseEntry(options, onOpen);

		return deferred.promise;
	};

	/*
	 * Attempts to restore a File based on a saved
	 * entryId. Returns a promise for the File.
	 */
	FileSystem.prototype.restore = function(entryId) {
		var deferred = $q.defer();
		var onRestore = function(entry) {
			if (checkError(deferred)) {
				return;
			}
			var result = new File(entry, entryId);
			deferred.resolve(result);
		};

		chrome.fileSystem.restoreEntry(entryId, onRestore);

		return deferred.promise;
	};

	/* 
	 * Writes data to a file and returns a File object 
	 */
	FileSystem.prototype.write = function(entry, data, type) {
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
				var result = new File(entry);
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
	};

	/* 
	 * Saves data to the specified entryId using the 'write' method 
	 */
	FileSystem.prototype.save = function(entryId, data, type) {
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
	};

	/*
	 * Creates a save-as dialog and returns a promise
	 * for the File.
	 */
	FileSystem.prototype.saveAs = function (filename, extension, data, type) {
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
	};

	return new FileSystem();
}]);
