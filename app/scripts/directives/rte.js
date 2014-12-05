/*global $:false, angular:false */
'use strict';

angular.module('Clockdoc.Directives')
.directive('cwRte', ['$timeout', function($timeout) {
	return {
		restrict: 'A',
		scope: {
			model: '=cwRte',
			titleKey: '@cwRteTitleKey',
			contentKey: '@cwRteContentKey',
			toggle: '@cwRteToggle'
		},
		link: function(scope, el) {
			var editor = $('#modal-rte');
			var model = scope.model;
			var titleKey = scope.titleKey || 'title';
			var contentKey = scope.contentKey || 'content';

			var saveChanges = function() {
				scope.$apply(function() {
					var content = editor.find('.rte-content textarea').val();
					model[contentKey] = content;
				});
			};

			var openEditor = function(e) {
				e.preventDefault();

				editor.off('.cw.rte');
				editor.on('click.cw.rte', '.rte-save', saveChanges);

				editor.find('.rte-title')
					.html(model[titleKey]);

				editor.find('.rte-content [contenteditable]')
					.html(model[contentKey])
					.trigger('keyup');

				editor.modal({keyboard: false, backdrop: 'static'});
			};

			var toggleButton = function(e, state, delay) {
				$timeout(function() {
					el.toggle(state);
				}, delay);
			};

			el.on('click.cw.rte', openEditor);

			// Hide the trigger button if a toggler has been specified
			if (scope.toggle) {
				var body = $(document.body);
				body.on('focus.cw.rte', scope.toggle, toggleButton.bind(true, 0));
				body.on('blur.cw.rte', scope.toggle, toggleButton.bind(false, 2000));
				el.hide();
			}
		}
	};
}]);
