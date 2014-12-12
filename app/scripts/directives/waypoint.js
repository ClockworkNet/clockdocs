/*global angular:false */
'use strict';

angular.module('Clockdoc.Directives')
.directive('cwWaypoint', ['$timeout', function($timeout) {
	return {
		restrict: 'A',
		scope: {
			action: '&cwWaypoint'
		},
		link: function(scope, el, attrs) {
			var options = {
				continuous: false,
				offset: 330,
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

			var action = function() {
				$timeout(scope.action);
			};
			el.waypoint(action, options);
		}
	};
}]);
