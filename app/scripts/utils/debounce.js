/*global angular:false */

'use strict';

angular.module('Clockdoc.Utils')
.factory('debounce', ['$timeout', '$q', function($timeout, $q) {

	return function(func, wait, immediate) {

		var timeout;
		var deferred = $q.defer();

		return function() {
			var ctx = this,
				args = arguments,
				callNow = immediate && !timeout;

			var exec = function() {
				deferred.resolve(func.apply(ctx, args));
				deferred = $q.defer();
			};

			var later = function() {
				timeout = null;
				if (!immediate) {
					exec();
				}
			};

			if (timeout) {
				$timeout.cancel(timeout);
			}

			timeout = $timeout(later, wait);

			if (callNow) {
				exec();
			}

			return deferred.promise;
		};
	};
}]);
