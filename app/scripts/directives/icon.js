/*global angular:false */
'use strict';

angular.module('Clockdoc.Directives')
// Wrapper for injecting icons into the interface
.directive('cwIcon', function() {
	return {
		restrict: 'E',
		scope: {
			type: '@',
			css: '@class'
		},
		templateUrl: 'partials/icon.html'
	};
});
