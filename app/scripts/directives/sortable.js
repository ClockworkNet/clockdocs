/*global $:false, angular:false */
'use strict';

angular.module('Clockdoc.Directives')
// Makes an element sortable
.directive('cwSortable', function() {
	return {
		restrict: 'C',
		scope: {
			key: '@cwSortKey',
			handle: '@cwSortHandle',
			items: '@cwSortItems',
			empty: '@cwEmptyItems',
			nested: '@cwSortNested',
			toleranceElement: '@cwSortToleranceElement',
			onUpdate: '&cwSortOnUpdated',
			onStart: '&cwSortOnStarted',
			onStop: '&cwSortOnStopped'
		},
		link: function(scope, el) {
			var itemKey = scope.key || 'guid';
			var itemSelector = scope.items || '.cw-sorted';
			var emptySelector = scope.empty || '.cw-sorted-empty';

			var dragParentGuid = null;

			scope.$watch('readonly', function() {
				var toggle = scope.readonly ? 'enable' : 'disable';
				$(el).sortable(toggle);
			});

			var getParentGuid = function(item) {
				var parent = item.parent();
				while (parent.length) {
					var parentGuid = parent.data(itemKey);
					if (parentGuid) {
						return parentGuid;
					}
					parent = parent.parent();
				}
				return null;
			};

			var updated = function(e, ui) {
				var dropped = $(ui.item);
				var args = {};

				args.guid = dropped.data(itemKey);
				args.parentGuid = getParentGuid(dropped);
				args.index = dropped.prevAll(':not(' + emptySelector + ')').length;

				// When the node moved is placed outside its current parent,
				// remove it from the DOM. Otherwise, it will get cloned.
				if (args.parentGuid !== dragParentGuid) {
					dropped.remove();
				}

				scope.onUpdate(args);
			};

			var started = function(e, ui) {
				var item = $(ui.item);
				dragParentGuid = getParentGuid(item);
				scope.onStart();
			};

			var stopped = function() {
				dragParentGuid = null;
				scope.onStop();
			};

			var options = {
				axis: 'y',
				cursor: 'hand',
				distance: 5,
				delay: 250,
				forcePlaceholderSize: true,
				handle: scope.handle,
				items: itemSelector,
				opacity: 0.8,
				placeholder: 'cw-sortable-placeholder',
				scroll: true,
				start: started,
				stop: stopped,
				tolerance: 'intersect',
				update: updated
			};

			if (scope.nested) {
				options.connectWith = '.cw-sortable';
			}

			options.toleranceElement = scope.toleranceElement || false;

			$(el).sortable(options);
		}
	};
})

// Make an element copyable
.directive('copyable', function() {
	return {
		restrict: 'C',
		link: function(scope, el) {
			el.attr('title', 'Click to copy to clipboard');
			el.on('click', function() {
				var copy = $('<input />').val(el.text());
				$('body').append(copy);
				copy.focus().select();
				document.execCommand('SelectAll');
				document.execCommand('Copy');
				copy.remove();
				console.info('Copied to clipboard \'' + el.text() + '\'');
			});
		}
	};
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
		link: function(scope, el) {
			scope.dropped = scope.dropped || function(result) {
				console.info('File uploaded', result);
			};

			function Progress(target) {
				this.target = target;
				this.processed = 0;
				this.done = function() {
					return this.processed >= this.target;
				};
				this.update = function() {
					this.processed++;
				};
			}

			var read = function(file, progress) {
				var reader = new FileReader();

				reader.onerror = function(e) {
					console.error('Error reading file', file, e);
				};

				reader.onload = function() {
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

				console.log('Starting file read', file);
				reader.readAsDataURL(file);
			};

			// Add click handling for manual upload
			el.on('click', function() {
				FileSystem.openFiles(['jpg', 'png', 'gif', 'svg'], true)
				.then(function(results) {
					if (!results) {return;}
					var progress = new Progress(results.length);
					results.forEach(function(result) {
						result.entry.file(function(file) {
							read(file, progress);
						});
					});
				});
				return false;
			});

			el.on('dragout', function() {
				el.removeClass(scope.dragoverClass)
				.removeClass(scope.uploadingClass);
			});

			el.on('dragover', function() {
				el.addClass(scope.dragoverClass);
				return false;
			});

			el.on('drop', function(e) {
				el.addClass(scope.uploadingClass);
				var transfer = e.originalEvent && e.originalEvent.dataTransfer;
				var files    = transfer && transfer.files;
				if (!files || files.length === 0) {
					return false;
				}
				var progress = new Progress(files.length);
				for (var i=0; i<files.length; i++) {
					read(files[i], progress);
				}
				return false;
			});
		}
	};
}]);
