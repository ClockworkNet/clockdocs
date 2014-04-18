angular.module('Clockdoc.Directives')
// Adds angular binding to contenteditable elements
.directive('contenteditable', function() {
	var formatHtml = function(html, e) {
		return html;
	};
	return {
		restrict: 'A',
		require: '?ngModel',
		link: function($scope, el, attrs, ngModel) {
			if (!ngModel) return;
			ngModel.$render = function() {
				el.html(ngModel.$viewValue || '');
			};
			var update = function(e) {
				var html = formatHtml(el.html(), e);
				el.html(html);

				$scope.$apply(function() {
					ngModel.$setViewValue(html);
				});
			};
			el.on('blur keyup change', update);
		}
	}
});

// Configure the text-angular directive
angular.module('textAngular')
.config(function($provide){
	$provide.decorator('taOptions', ['taRegisterTool', '$delegate', function(taRegisterTool, taOptions) {
		taRegisterTool('subscript', {
			iconclass: 'fa fa-subscript',
			actions: function() {
				this.$editor().wrapSelection('subscript');
			}
		});

		taRegisterTool('superscript', {
			iconclass: 'fa fa-superscript',
			actions: function() {
				this.$editor().wrapSelection('superscript');
			}
		});

		taOptions.toolbar = [
			['redo', 'undo', 'clear'],
			['p', 'pre', 'quote', 'subscript', 'superscript'],
			['bold', 'italics', 'underline', 'strikethrough'],
			['ul', 'ol'],
			['justifyLeft','justifyCenter','justifyRight'],
			['html', 'insertImage', 'insertLink', 'unlink']
		];

		return taOptions;
	}]);
});

