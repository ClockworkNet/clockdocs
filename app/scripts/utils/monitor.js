/*global angular:false */

'use strict';

// $watch is too processor-heavy when you only want to watch
// for a change, not all changes.
angular.module('Clockdoc.Utils')
.service('Monitor', ['$interval', '$q', function($interval, $q) {

	function Change(key, oldVal, newVal) {
		this.key = key;
		this.oldVal = oldVal;
		this.newVal = newVal;
	}

	function Monitor(scope, key, interval) {
		this.interval = interval || 1000;
		this.scope = scope;
		this.key = key;
		this.deferred = null;
		this.poller = null;
		this.original = angular.copy(scope[key]);
	}

	Monitor.prototype.start = function() {
		this.deferred = $q.defer();
		var watcher = this.check.bind(this);
		this.poller = $interval(watcher, this.interval);
		return this.deferred.promise;
	};

	Monitor.prototype.stop = function() {
		this.deferred.reject();
		$interval.cancel(this.poller);
	};

	Monitor.prototype.check = function() {
		if (angular.equals(this.original, this.scope[this.key])) {
			return;
		}
		var change = new Change(this.key, this.original, this.scope[this.key]);
		this.deferred.resolve(change);
		$interval.cancel(this.poller);
	};

	return Monitor;
}]);
