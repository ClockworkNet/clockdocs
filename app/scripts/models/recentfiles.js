/*global angular:false */
'use strict';

angular.module('Clockdoc.Models')
.service('RecentFiles', ['$q', 'LocalStorage', 'FileSystem', 'File', function($q, LocalStorage, FileSystem, File) {
	function RecentFiles() {
		this.key = 'recent_entries';
		this.max = 10;
		this.items = [];
	}

	// Returns a filtered list of the items
	RecentFiles.prototype.filter = function(items) {
		if (!items || !items.length) {
			return [];
		}
		var paths = {};
		for (var i=0; i<items.length; i++) {
			var item = items[i];
			var file = item.file;
			var path = file.local && file.local.full;

			// exclude items without local file references
			if (!path) {
				continue;
			}

			// prefer items with remote locations
			if (paths[path] && !item.remote) {
				continue;
			}

			paths[path] = item;
		}

		var a = [];
		for (var p in paths) {
			a.push(paths[p]);
		}
		return a;
	};

	RecentFiles.prototype.load = function() {
		var deferred = $q.defer();

		var onload = function(items) {
			this.items = this.filter(items);
			deferred.resolve(this.items);
		};

		LocalStorage.get(this.key)
		.then(onload.bind(this));

		return deferred.promise;
	};

	RecentFiles.prototype.set = function(items) {
		var deferred = $q.defer();

		this.items = this.filter(items).slice(0, this.max);

		LocalStorage.set(this.key, this.items)
		.then(deferred.resolve.bind(this, this.items));

		return deferred.promise;
	};


	RecentFiles.prototype.add = function(memory) {
		// Add the entry to the top
		this.items.splice(0, 0, memory);
		return this.set(this.items);
	};

	/**
	 *¬Forgets the specified entry and shows an error message
	**/
	RecentFiles.prototype.forget = function(file) {
		var path = file && file.local && file.local.full;
		var items = this.items.filter(function(r) {
			return r.file && r.file.local && r.file.local.full !== path;
		});
		return this.set(items);
	};

	/**
	 * Remembers a recent entry into LocalStorage¬
	**/
	RecentFiles.prototype.remember = function(file, title) {
		var deferred = $q.defer();

		if (!file || !file.entry) {
			deferred.resolve(this.items);
			return deferred.promise;
		}

		if (!file.entryId) {
			file.entryId = FileSystem.retain(file.entry);
		}

		var memory = {
			name: file.entry.name,
			title: title,
			file: file,
			date: new Date()
		};

		var self = this;

		FileSystem.getDisplayPath(file.entry)
		.then(function(path) {
			memory.file.local = new File.Location(path);
			self.add(memory).then(deferred.resolve.bind(self));
		});

		return deferred.promise;
	};

	return new RecentFiles();

}]);
