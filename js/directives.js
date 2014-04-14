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
}})
.directive('scroller', function() {
return {
	restrict: 'A',
	link: function(scope, el, attrs) {
		var targetId = null;
		var speed = attrs.scrollerSpeed || 1;
		scope.$watch(attrs.scroller, function(value) {
			targetId = value;
		});
		var scroll = function() {
			var targetEl = $('#' + targetId);
			var offset = targetEl && targetEl.offset();
			if (!offset) {
				console.error("Invalid scroller target id", targetId);
				return false;
			}
			var distance = Math.abs(el.offset().top - offset.top);
			var time = distance / speed;
			$('body').animate({scrollTop: offset.top}, time);
			return false;
		};
		el.on('click', scroll);
	}
}});
