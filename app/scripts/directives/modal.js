/*global $:false, angular:false */
'use strict';

angular.module('Clockdoc.Directives')
// Create a modal using a 'modal' attribute on an element
.directive('modal', function() {
	return {
		restrict: 'A',
		scope: {
			title: '@modalTitle',
			body: '@modalBody',
			action: '@modalAction',
			actionType: '@modalActionType',
			click: '&modalClick'
		},
		transclude: true,
		templateUrl: '/partials/modal.html',
		link: function(scope, el) {
			var popup = el.find('.modal');
			$('body').append(popup.remove());
			popup.on('click', '.btn-action', scope.click);
		}
	};
});
