/*global angular:false */
'use strict';

angular.module('Clockdoc.Directives')
.directive('cwWaypoint', ['debounce', function(debounce) {
	var action = function() {};
	var callAction = debounce(function() {
		action();
	}, 100);

	return {
		restrict: 'A',
		scope: {
			action: '&cwWaypoint'
		},
		link: function(scope, el, attrs) {
			var options = {
				continuous: false,
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

			var setAction = function() {
				action = scope.action;
				callAction();
			};

			el.waypoint(setAction, options);
		}
	};
}]);
