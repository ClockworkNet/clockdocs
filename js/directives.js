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
		var padding = attrs.padding || 100;
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
			var destination = offset.top - padding;
			var distance = Math.abs(el.offset().top - destination);
			var time = distance / speed;
			$('body').animate({scrollTop: destination}, time, function() {
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

// Create a modal using a "modal" attribute on an element
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
	link: function(scope, el, attrs) {
		var popup = el.find('.modal');
		$('body').append(popup.remove());
		popup.on('click', '.btn-action', scope.click);
	}
}})

// Makes an element sortable
.directive('sortable', function() {
return {
	restrict: 'C',
	scope: {
		key: '@sortKey'
		, axis: '@sortAxis'
		, handle: '@sortHandle'
		, items: '@sortItems'
		, onStart: '&sortOnStart'
		, onUpdate: '&sortOnUpdate'
		, onStop: '&sortOnStop'
	},
	link: function(scope, el, attrs) {
		var itemSelector = scope.items || '> *';
		var itemKey      = scope.key   || 'guid';
		var axis         = scope.axis  || 'y';

		var wrap = function(msg, func) {
			return function(e, ui) {
				var els = el.find(itemSelector);
				var ids = els.map(function(i, o) {
					return $(o).data(itemKey)
				}).get();
				func({guids: ids});
			}
		};

		$(el).sortable({
			axis       : axis 
			, distance : 5

			, forcePlaceholderSize : true
			, placeholder          : attrs.sortPlaceholder || 'placeholder'

			, items  : itemSelector
			, scroll : true
			, handle : scope.handle

			, start  : wrap('drag start', scope.onStart)
			, update : wrap('drag update', scope.onUpdate)
			, stop   : wrap('drag stop', scope.onStop)
		});
	}
}})
;
