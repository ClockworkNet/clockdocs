/*global angular:false */
'use strict';

angular.module('Clockdoc.Directives')
.directive('cwWaypoint', [function() {
	return {
		restrict: 'A',
		scope: {
			action: '&cwWaypoint'
		},
		link: function(scope, el, attrs) {
			var options = {
				offset: 300,
			};
			var prefix  = 'cwWaypoint';
			for (var key in attrs) {
				if (key.indexOf(prefix) !== 0) {
					continue;
				}
				var option = key.substr(prefix.length).toLowerCase();
				if (!option.length) {
					continue;
				}
				options[option] = attrs[key];
			}
			el.waypoint(scope.action, options);
		}
	};
}]);
