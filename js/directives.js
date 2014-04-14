angular.module('Clockdoc.Directives', [])
.directive('contenteditable', function() {
return {
	restrict: 'A',
	require: '?ngModel',
	link: function($scope, el, attrs, ngModel) {
		if (!ngModel) return;
		ngModel.$render = function() {
			el.html(ngModel.$viewValue || '');
		};
		var update = function() {
			$scope.$apply(function() {
				var html = el.html();
				// Add any html re-formatting here
				ngModel.$setViewValue(html);
			});
		};
		el.on('blur keyup change', update);
	}
}});
