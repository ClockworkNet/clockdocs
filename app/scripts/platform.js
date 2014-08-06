/*global angular:false */
'use strict';

angular.module('Clockdoc.Utils')
.service('Platform', function() {
	this.load = function(scope, key) {
		chrome.runtime.getPlatformInfo(function(info) {
			scope.$apply(function() {
				Object.keys(info).forEach(function(k) {
					var value = info[k];
					info[value] = true;
				});
				scope[key] = info;
			});
		});
	};
});
