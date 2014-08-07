/*global angular:false */
/*jslint bitwise: true */

'use strict';

angular.module('Clockdoc.Utils')
.service('Random', function() {
	// Returns a random letter in [a-z]
	this.letter = function() {
		return ((11 + Math.random() * 26) | 0).toString(36);
	};

	// Returns a random letter or number in [0-9a-z]
	this.character = function() {
		return ((1 + Math.random() * 36) | 0).toString(36);
	};

	// Returns a random id
	this.id = function(len) {
		len = len || 16;
		// The first character should be limited to a letter
		var s = this.letter();
		for (var i=1; i<len; i++) {
			s += this.character();
		}
		return s;
	};
});
