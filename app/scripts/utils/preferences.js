/*global angular:false */
'use strict';

angular.module('Clockdoc.Utils')
.service('Preferences', ['LocalStorage', function(LocalStorage) {
	var KEY = 'preferences';

	function Preferences() {
		this.load();
	}

	Preferences.prototype.load = function() {
		var ctx = this;
		LocalStorage.get(KEY)
		.then(function(data) {
			angular.forEach(data, function(value, key) {
				ctx[value] = key;
			});
		});
	};

	Preferences.prototype.save = function() {
		LocalStorage.set('preferences', this);
	};

	return new Preferences();
}]);
