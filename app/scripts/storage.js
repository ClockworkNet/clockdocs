/*global angular:false */
'use strict';

/**
 * Provides access to local storage
**/
angular.module('Clockdoc.Utils')
.factory('Storage', ['$q', function($q) {
	function Storage(type) {
		this.storage = type || chrome.storage.local;
	}

	Storage.prototype.get = function(key) {
		var deferred = $q.defer();
		var findOne = function(items) {
			var item = items ? items[key] : null;
			deferred.resolve(item);
		};
		this.getMany(key).then(findOne);
		return deferred.promise;
	};

	Storage.prototype.getMany = function(keys) {
		var deferred = $q.defer();
		var callback = function(items) {
			if (chrome.runtime.lastError) {
				deferred.reject(chrome.runtime.lastError);
			}
			else {
				deferred.resolve(items);
			}
		};
		this.storage.get(keys, callback);
		return deferred.promise;
	};

	Storage.prototype.set = function(key, value) {
		var items = {};
		items[key] = value;
		return this.setMany(items);
	};

	Storage.prototype.setMany = function(items) {
		var deferred = $q.defer();
		var callback = function() {
			if (chrome.runtime.lastError) {
				deferred.reject(chrome.runtime.lastError);
			}
			else {
				deferred.resolve(items);
			}
		};
		this.storage.set(items, callback);
		return deferred.promise;
	};

	return Storage;
}]);

angular.module('Clockdoc.Utils')
.factory('LocalStorage', ['Storage', function(Storage) {
	return new Storage(chrome.storage.local);
}]);
