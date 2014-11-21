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
		.then(function(json) {
			var data = angular.fromJson(json);
			angular.forEach(data, function(value, key) {
				ctx[key] = value;
			});
		});
	};

	Preferences.prototype.save = function() {
		var json = angular.toJson(this);
		LocalStorage.set(KEY, json);
	};

	return new Preferences();
}]);
