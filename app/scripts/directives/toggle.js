/*global angular:false */
'use strict';

angular.module('Clockdoc.Directives')
.directive('cwToggle', function() {
	return {
		restrict: 'E',
		scope: {
			model: '=cwModel',
			prop: '@cwProp',
			offMsg: '@cwOffMsg',
			onMsg: '@cwOnMsg',
		},
		templateUrl: 'partials/toggle.html',
		link: function(scope) {
			scope.isOn = function() {
				return scope.model[scope.prop];
			};

			scope.setProp = function(val) {
				scope.model[scope.prop] = val;
			};
		}
	};
});
