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
		, axis: '@cwSortAxis'
		, handle: '@cwSortHandle'
		, items: '@cwSortItems'
		, nested: '@cwSortNested'
		, keepOnUpdate: '@cwSortKeepOnUpdate'
		, onUpdate: '&cwSortOnUpdate'
		, onStart: '&cwSortOnStart'
		, onSop: '&cwSortOnStop'
	},
	link: function(scope, el, attrs) {
		var itemSelector = scope.items || '.cw-sorted';
		var itemKey      = scope.key   || 'guid';
		var axis         = scope.axis  || 'y';

		// Creates a hierarchical view of the ids being sorted
		var crawl = function(branch, tree) {
			tree = tree || [];

			var id = branch.data(itemKey);
			if (id) {
				var node = {
					'guid': id, 
					children: []
				};
				tree.push(node);
				tree = node.children;
			}

			branch.children().each(function() {
				var child = $(this);
				crawl(child, tree);
			});

			return tree;
		};

		var treed = function(func) {
			if (!func) {
				console.warn("No update function defined");
				return function(e, ui) {}
			}
			return function(e, ui) {
				var args = {};
				var dropped = $(ui.item);
				var parent = dropped.parent();
				args.guid = dropped.data(itemKey);
				while (parent.length) {
					var parentGuid = parent.data(itemKey);
					if (parentGuid) {
						args.parentGuid = parentGuid;
						break;
					}
					parent = parent.parent();
				}
				args.index = dropped.prevAll().length;

				if (!scope.keepOnUpdate) {
					dropped.remove();
				}
				func.call(null, args);
			}
		};

		var wrap = function(func) {
			return func || function(e, ui) {};
		};

		var connection = scope.nested ? '.cw-sortable' : '';

		$(el).sortable({
			axis        : axis 
			, distance  : 5
			, delay     : 250
			, opacity   : 0.5
			, helper    : 'clone'

			, placeholder          : 'cw-sortable-placeholder'
			, forcePlaceholderSize : true

			, items       : itemSelector
			, connectWith : connection

			, scroll : true
			, handle : scope.handle

			, start: wrap(scope.onStart)
			, stop: wrap(scope.onStop)
			, update : treed(scope.onUpdate)
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
