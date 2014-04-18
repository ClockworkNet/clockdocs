angular.module('Clockdoc.Utils')
.factory('FileSystem', function() {

var listeners = {
	'error'  : [],
	'cancel' : [],
	'open'   : [],
	'read'   : [],
	'write'  : []
};

return {
	on: function(event, callback) {
		listeners[event].push(callback);
	},

	fire: function(event) {
		var args = Array.prototype.splice.call(arguments, 1);
		var self = this;
		listeners[event].forEach(function(callback) {
			callback.apply(self, args);
		});
	},

	// Allows the user to open a file. The callback
	// receives the contents, file entry, and progress event
	open: function(extensions, callback) {
		var self = this;
		var onOpen = function(entry) {
			if (!entry) {
				self.fire('cancel');
				if (callback) callback.apply(self, arguments);
				return;
			}

			var entryId = chrome.fileSystem.retainEntry(entry);

			self.fire('open', entry, entryId);
			var reader = new FileReader();

			reader.onerror = function(e) {
				self.fire('error', e);
			};

			reader.onload = function(event) {
				var content = event.target && event.target.result;
				var result  = {
					content: content,
					entry: entry,
					event: event,
					entryId: entryId
				};
				self.fire('read', result);
				if (callback) {
					callback.call(self, result);
				}
			};

			entry.file(function(file) {
				reader.readAsText(file);
			}, function(e) {
				self.fire('error', e);
			});
		};
		var args = {type: 'openWritableFile'};
		if (extensions) args.accepts = [{extensions: extensions}];
		chrome.fileSystem.chooseEntry(args, onOpen);
	},

	write: function(entry, data, type) {
		if (!entry) {
			self.fire('cancel');
			return;
		}

		type = type || 'text';

		var self = this;

		var onError = function(e) {
			self.fire('error', e);
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
		};

		entry.createWriter(function(writer) {
			writer.onerror    = onError;
			writer.onwriteend = onWrite;
			writer.write(new Blob([data], {type: type}));
		}, onError);
	},

	save: function(entryId, data, type) {
		var self = this;
		chrome.fileSystem.restoreEntry(entryId, function(entry) {
			if (chrome.runtime.lastError) {
				self.fire('error', chrome.runtime.lastError);
				return;
			}
			self.write(entry, data, type);
		});
	},

	saveAs: function (filename, extension, data, type) {
		var self = this;
		var args = {
			type: 'saveFile',
			suggestedName: filename,
			accepts: [{extensions: [extension]}]
		};
		chrome.fileSystem.chooseEntry(args, function(entry) {
			self.write(entry, data, type);
		});
	}
};

});
