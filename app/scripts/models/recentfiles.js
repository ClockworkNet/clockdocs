/*global angular:false */
'use strict';

angular.module('Clockdoc.Models')
.service('RecentFiles', ['$q', 'FileSystem', 'LocalStorage', function($q, FileSystem, LocalStorage) {
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
			var path = item.local && item.local.full;

			// exclude items without file references
			if (!item.entry || !item.path) {
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

		items = this.filter(items);
		items = items.slice(0, this.max);

		var onset = function(items) {
			this.items = items;
			deferred.resolve(items);
		};

		LocalStorage.set(this.key, items)
		.then(onset.bind(this));

		return deferred.promise;
	};

	/**
	 *¬Forgets the specified entry and shows an error message
	**/
	RecentFiles.prototype.forget = function(file) {
		var path = file && file.path;
		var items = this.items.filter(function(r) {
			return r.path !== path;
		});
		return this.set(items);
	};

	/**
	 * Remembers a recent entry into LocalStorage¬
	**/
	RecentFiles.prototype.remember = function(file, title) {
		if (!file || !file.entry) {
			return this.set(this.items);
		}

		var items = this.items || [];

		if (!file.entryId) {
			file.entryId = FileSystem.retain(file.entry);
		}

		var memory = {
			name: file.entry.name,
			title: title,
			file: file,
			date: new Date()
		};

		var deferred = $q.defer();

		var self = this;

		FileSystem.getDisplayPath(file.entry)
		.then(function(path) {
			memory.path = path;

			// Add the entry to the top
			items.splice(0, 0, memory);

			// Trim the array of items 
			self.set(items)
			.then(deferred.resolve.bind(self, items));
		});

		return deferred.promise;
	};

	return new RecentFiles();

}]);
