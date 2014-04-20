angular.module('Clockdoc.Utils')
.factory('FileSystem', ['$q', function($q) {

var listeners = {
	'error'  : [],
	'cancel' : [],
	'open'   : [],
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
		listeners[event].forEach(function(callback) {
			// Wrapped in timeout to ensure asynchronous firing
			setTimeout(function() {
				callback.apply(self, args);
			}, 0);
		});
	},

	// Allows the user to open a file or directory. 
	//
	// If you specify extensions, the promise resolves with an object that
	// contains the contents, file entry, entry id, and progress event
	//
	// If you leave out extensions, the promise resolves to an object
	// with the entry and entry id
	open: function(extensions) {
		var self = this;
		var deferred = $q.defer();

		var onOpen = function(entry) {
			if (!entry) {
				self.fire('cancel');
				return deferred.resolve(null);
			}

			var entryId = chrome.fileSystem.retainEntry(entry);

			var result = {
				entry: entry,
				entryId: entryId
			};

			self.fire('open', result);

			if (entry.isDirectory) {
				return deferred.resolve(result);
			}

			var reader = new FileReader();

			reader.onerror = function(e) {
				self.fire('error', e);
				return deferred.reject(e);
			};

			reader.onload = function(event) {
				result.event   = event;
				result.content = event.target && event.target.result;
				self.fire('read', result);
				return deferred.resolve(result);
			};

			entry.file(function(file) {
				reader.readAsText(file);
			}, function(e) {
				self.fire('error', e);
				return deferred.reject(e);
			});

		};
		var args = {}
		if (extensions) {
			args.type = 'openWritableFile';
			args.accepts = [{extensions: extensions}];
		}
		// If extensions weren't specified, then we're getting a directory
		else {
			args.type = 'openDirectory';
		}
		chrome.fileSystem.chooseEntry(args, onOpen);

		return deferred.promise;
	},

	write: function(entry, data, type) {
		var self = this;
		var deferred = $q.defer();

		if (!entry) {
			self.fire('cancel');
			return;
		}

		self.fire('writing', {
			content: data,
			entry: entry
		});

		type = type || 'text';

		var onError = function(e) {
			self.fire('error', e);
			deferred.reject(e);
		};

		var onWrite = function(w) {
			var entryId = chrome.fileSystem.retainEntry(entry);
			var result = {
				writer: w,
				content: data,
				entry: entry,
				entryId: entryId
			};
			self.fire('write', result);
			deferred.resolve(result);
		};

		entry.createWriter(function(writer) {
			writer.onerror    = onError;
			writer.onwriteend = onWrite;
			writer.write(new Blob([data], {type: type}));
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
