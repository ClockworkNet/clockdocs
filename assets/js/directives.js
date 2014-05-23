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
.directive('cwSortable', function() {
return {
	restrict: 'C',
	scope: {
		key: '@cwSortKey'
		, handle: '@cwSortHandle'
		, items: '@cwSortItems'
		, nested: '@cwSortNested'
		, toleranceElement: '@cwSortToleranceElement'
		, onUpdate: '&cwSortOnUpdate'
		, onStart: '&cwSortOnStart'
		, onSop: '&cwSortOnStop'
	},
	link: function(scope, el, attrs) {
		var itemKey = scope.key || 'guid';
		var self = this;

		var dragParentGuid = null;

		var getParentGuid = function(item) {
			parent = item.parent();
			while (parent.length) {
				var parentGuid = parent.data(itemKey);
				if (parentGuid) {
					return parentGuid;
				}
				parent = parent.parent();
			}
			return null;
		};

		var onUpdate = function(e, ui) {
			var dropped = $(ui.item);
			var args = {};

			args.guid = dropped.data(itemKey);
			args.parentGuid = getParentGuid(dropped);
			args.index = dropped.prevAll().length;

			// When the node moved is placed outside its current parent,
			// remove it from the DOM. Otherwise, it will get cloned.
			if (args.parentGuid != dragParentGuid) {
				dropped.remove();
			}

			if (scope.onUpdate) {
				scope.onUpdate.call(self, args);
			}
		};

		var onStart = function(e, ui) {
			var item = $(ui.item);
			dragParentGuid = getParentGuid(item);
			if (scope.onStart) {
				scope.onStart.call(self, e, ui);
			}
		};

		var onStop = function(e, ui) {
			dragParentGuid = null;
			if (scope.onStop) {
				scope.onStop.call(self, e, ui);
			}
		};

		var itemSelector = scope.items || '.cw-sorted';
		var options = {
			distance: 5
			, delay: 250
			, opacity: 0.5
			, tolerance: 'intersect'
			, placeholder: 'cw-sortable-placeholder'
			, forcePlaceholderSize: true
			, items: itemSelector
			, scroll: true
			, handle: scope.handle
			, start: onStart
			, stop: onStop
			, update: onUpdate
		};

		if (scope.nested) {
			options.connectWith = '.cw-sortable';
		}

		options.toleranceElement = scope.toleranceElement || false;

		$(el).sortable(options);
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

// Create a drag-n-drop area for adding an image.
.directive('cwFileDrop', ['$rootScope', 'FileSystem', function($rootScope, FileSystem) {
return {
	restrict: 'A',
	scope: {
		dropped: '&cwFileDrop',
		uploadingClass: '@cwUploadingClass',
		dragoverClass: '@cwDragoverClass'
	},
	link: function(scope, el, attrs) {
		scope.dropped = scope.dropped || function(result) {
			console.info("File uploaded", result);
		};

		function Progress(target) {
			this.target = target;
			this.processed = 0;
			this.done = function() {
				return this.processed >= this.target;
			};
			this.update = function() {
				this.processed++;
			}
		};

		var read = function(file, progress) {
			var reader = new FileReader();

			reader.onerror = function(e) {
				console.error("Error reading file", file, e);
			};

			reader.onload = function(e) {
				file.data = reader.result;

				$rootScope.$apply(function() {
					scope.dropped({file: file});
				});
				progress.update();
				if (progress.done()) {
					el.removeClass(scope.uploadingClass)
					.removeClass(scope.dragoverClass);
				}
			};

			console.log("Starting file read", file);
			reader.readAsDataURL(file);
		};

		// Add click handling for manual upload
		el.on('click', function(e) {
			FileSystem.openFiles(['jpg', 'png', 'gif', 'svg'], true)
			.then(function(results) {
				if (!results) return;
				var progress = new Progress(results.length);
				results.forEach(function(result) {
					result.entry.file(function(file) {
						read(file, progress);
					});
				});
			});
			return false;
		});

		el.on('dragout', function(e) {
			el.removeClass(scope.dragoverClass)
			.removeClass(scope.uploadingClass);
		});

		el.on('dragover', function(e) { 
			el.addClass(scope.dragoverClass);
			return false; 
		});

		el.on('drop', function(e) {
			el.addClass(scope.uploadingClass);
			var transfer = e.originalEvent && e.originalEvent.dataTransfer;
			var files    = transfer && transfer.files;
			if (!files || files.length == 0) {
				return false;
			}
			var progress = new Progress(files.length);
			for (var i=0; i<files.length; i++) {
				read(files[i], progress);
			}
			return false;
		});
	}
}
}])
