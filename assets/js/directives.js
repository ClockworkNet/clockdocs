angular.module('Clockdoc.Directives')

// Adds a click event to an element that will scroll the window
// to the specified target (and select all text)
.directive('cwScroller', ['Scroll', function(Scroll) {
return {
	restrict: 'A',
	link: function(scope, el, attrs) {
		var targetId = null;
		var self     = this;

		attrs.cwScrollerSource = el;

		scope.$watch(attrs.cwScroller, function(value) {
			targetId = value;
		});

		var scroll = function() {
			Scroll.to(targetId, attrs);
		};

		el.on('click', scroll);
	}
}}])

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
.directive('cwIcon', function() {
return {
	restrict: 'E',
	scope: {
		type: '@'
		, css: '@class'
	},
	templateUrl: 'partials/icon.html'
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

// Make an element copyable
.directive('copyable', function() {
return {
	restrict: 'C',
	link: function(scope, el, attrs) {
		el.attr('title', "Click to copy to clipboard");
		el.on('click', function() { 
			var copy = $('<input />').val(el.text());
			$('body').append(copy);
			copy.focus().select();
			document.execCommand('SelectAll');
			document.execCommand('Copy');
			copy.remove();
			console.info("Copied to clipboard '" + el.text() + "'");
		});
	}
}
})
;
