angular.module('Clockdoc.Directives', [])
// Adds angular binding to contenteditable elements
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
// Adds a click event to an element that will scroll the window
// to the specified target (and select all text)
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
			$('body').animate({scrollTop: offset.top}, time, function() {
				targetEl.focus();
				document.execCommand('selectAll', false, null);
			});
			return false;
		};
		el.on('click', scroll);
	}
}})

// Executes one or more content editing commands on the target specified
// with the exec-target attribute
.directive('exec', function() {
return {
	restrict: 'A',
	link: function(scope, el, attrs) {
		el.on('click', function() {
			var cmds = attrs.exec.split(' ');
			var target = $(attrs.execTarget);
			if (target) target.focus();
			document.execCommand('selectAll', false, null);
			cmds.forEach(function(cmd) {
				document.execCommand(cmd, false, null);
			});
			if (target) target.blur();
		});
	}

}})
// Wrapper for injecting icons into the interface
.directive('icon', function() {
return {
	restrict: 'E',
	link: function(scope, el, attrs) {
		var type = attrs.type;
		var icon = $('<span/>')
			.addClass('glyphicon glyphicon-' + type)
			.addClass(attrs.class);
		el.html(icon);
	}
}})

.directive('modal', function() {
return {
	restrict: 'A',
	scope: {
		title: '@modalTitle',
		body: '@modalBody',
		action: '@modalAction',
		click: '&modalClick'
	},
	transclude: true,
	templateUrl: '/partials/modal.html',
	link: function(scope, el, attrs) {
		var popup = el.find('.modal');
		$('body').append(popup.remove());
		popup.on('click', '.btn-action', scope.click);
	}
}})
;
