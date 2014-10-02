/*global angular:false */
'use strict';

angular.module('Clockdoc.Directives')

// Adds a click event to an element that will scroll the window
// to the specified target (and select all text)
.directive('cwScroller', ['Scroll', function(Scroll) {
	return {
		restrict: 'A',
		scope: {
			targetId: '=cwScroller',
			disabled: '=cwScrollerDisabled'
		},
		link: function(scope, el, attrs) {
			attrs.cwScrollerSource = el;

			var scroll = function(e) {
				e.preventDefault();
				if (!scope.disabled) {
					Scroll.to(scope.targetId, attrs);
				}
			};

			el.on('click', scroll);
		}
	};
}]);
