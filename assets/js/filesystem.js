angular.module('Clockdoc.Utils')
.factory('FileSystem', ['$q', function($q) {

var listeners = {
	'info'   : [],
	'error'  : [],
	'cancel' : [],
	'open'   : [],
	'reading': [],
	'read'   : [],
	'writing': [],
	'write'  : []
};

return {
	on: function(events, callback) {
		var events = events.split(' ');
		events.forEach(function(event) {
			listeners[event].push(callback);
		});
	},

	fire: function(event) {
		var args = Array.prototype.splice.call(arguments, 1);
		var self = this;
		console.trace('firing', event, args);
		listeners[event].forEach(function(callback) {
			// Wrapped in timeout to ensure asynchronous firing
			setTimeout(function() {
				callback.apply(self, args);
			}, 0);
		});
	},

	read: function(result, readMethod) {
		var deferred = $q.defer();
		var self = this;

		if (!result || !result.entry || !result.entry.isFile) {
			self.fire('cancel', result);
			deferred.resolve(result);
			return deferred.promise;
		}

		var reader = new FileReader();

		reader.onerror = function(e) {
			self.fire('error', e);
			return deferred.reject(e);
		};

		reader.onload = function(event) {
			result.event   = event;
			result.content = reader.result;
			self.fire('read', event);
			return deferred.resolve(result);
		};

		readMethod = readMethod || 'readAsText';

		result.entry.file(function(file) {
			self.fire('reading', file);
			reader[readMethod](file);
		}, function(e) {
			self.fire('error', e);
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

	openFiles: function(extensions, readOnly) {
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
			if (!entries || entries.length < 1) {
				self.fire('cancel', entries);
				return deferred.resolve(null);
			}

			entries = Array.isArray(entries) ? entries : [entries];
			var results = [];

			entries.forEach(function(entry, index) {
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

			self.fire('open', results);
			deferred.resolve(results);
		};

		chrome.fileSystem.chooseEntry(options, onOpen);

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
		var self = this;
		var deferred = $q.defer();

		if (!entry) {
			deferred.resolve(null);
			return deferred.promise;
		}

		self.fire('writing', {
			content: data,
			entry: entry
		});

		type = type || 'text/plain';

		var loggedError = false;
		var onError = function(e) {
			if (!loggedError) {
				console.error("Error writing file", e);
				loggedError = true;
			}
			deferred.reject(e);
		};

		var startWrite = function(e) {
			var writer = this;
			writer.onwriteend = function(e) {
				var entryId = chrome.fileSystem.retainEntry(entry);
				var result = {
					writer: writer,
					content: data,
					entry: entry,
					entryId: entryId
				};
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
			if (chrome.runtime.lastError) {
				self.fire('error', chrome.runtime.lastError);
				return;
			}
			self.write(entry, data, type)
			.then(function(result) {
				if (result) {
					self.fire('write', result);
				}
				else {
					self.fire('cancel', result);
				}
				deferred.resolve(result);
			}, function(e) {
				self.fire('error', e);
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
				if (result) {
					self.fire('write', result);
				}
				else {
					self.fire('cancel', result);
				}
				deferred.resolve(result);
			}, function(e) {
				self.fire('error', e);
				deferred.reject(e);
			});
		});
		return deferred.promise;
	}
};

}]);
