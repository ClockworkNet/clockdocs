/*global angular:false */
'use strict';

angular.module('Clockdoc.Filters', ['Clockdoc.Utils'])
.filter('truncate', function() {
	return function(input, len) {
		len = len || 100;
		if (input.length < len) {return input;}
		return input.substr(0, len - 3) + '...';
	};
})
.filter('abbr', function() {
	return function(input) {
		return input.replace(/[^a-z0-9]/gi, '-').toLowerCase();
	};
})
.filter('unique', function() {
	return function(arr, key) {
		var seen = [];
		return arr.filter(function(o) {
			if (!(key in o)) {
				return true;
			}
			var val = o[key];
			if (seen.indexOf(val) >=0) {
				return false;
			}
			seen.push(val);
			return true;
		});
	};
})
;
