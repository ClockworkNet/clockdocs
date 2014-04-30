angular.module('Clockdoc.Directives')
// Adds angular binding to contenteditable elements
.directive('cwEditable', function() {
	return {
		restrict: 'A',
		require: '?ngModel',
		link: function($scope, el, attrs, ngModel) {
			el.attr('contenteditable', true);
			if (!ngModel) return;
			ngModel.$render = function() {
				el.html(ngModel.$viewValue || '');
			};
			var update = function(e) {
				$scope.$apply(function() {
					ngModel.$setViewValue(el.html());
				});
			};
			el.on('blur keyup change', update);
		}
	}
});

// Configure the text-angular directive
angular.module('textAngular')
.config(function($provide){
	// Create some new options
	$provide.decorator('taOptions', ['taRegisterTool', '$delegate', function(taRegisterTool, taOptions) {
		var wrap = function(cmd) {
			return function() {
				this.$editor().wrapSelection(cmd);
			}
		}

		taRegisterTool('subscript', {
			iconclass: 'fa fa-subscript',
			action: wrap('subscript')
		});

		taRegisterTool('superscript', {
			iconclass: 'fa fa-superscript',
			action: wrap('superscript')
		});

		taRegisterTool('strikethrough', {
			iconclass: 'fa fa-strikethrough',
			action: wrap('strikethrough')
		});

		taRegisterTool('indent', {
			iconclass: 'fa fa-indent',
			action: wrap('indent')
		});

		taRegisterTool('outdent', {
			iconclass: 'fa fa-outdent',
			action: wrap('outdent')
		});

		taOptions.toolbar = [
			['redo', 'undo', 'clear'],
			['p', 'pre', 'quote', 'subscript', 'superscript'],
			['bold', 'italics', 'underline', 'strikethrough'],
			['ul', 'ol'],
			['justifyLeft','justifyCenter','justifyRight', 'indent', 'outdent'],
			['html', 'insertImage', 'insertLink', 'unlink']
		];

		taOptions.classes.htmlEditor = 'form-content';
		taOptions.classes.textEditor = 'form-content';

		return taOptions;
	}]);

	// Updates some of the classes used for the buttons
	$provide.decorator('taTools', ['$delegate', function(taTools) {

		taTools.html.iconclass = 'fa fa-code';
		delete taTools.html.buttontext;

		function makeSelection(msg, cmd, placeholder) {
			var self = this;
			var selection = window.getSelection();
			var selectedNode = selection && selection.focusNode;
			placeholder = placeholder || '';
			prompt(msg, placeholder, function(val) {

				var currentSelection = window.getSelection();
				var range = document.createRange();
				range.selectNodeContents(selectedNode);
				currentSelection.addRange(range);

				if (!val || !val.length || val == placeholder) return;
				return self.$editor().wrapSelection(cmd, val);
			});
		};

		taTools.insertImage.action = function() {
			makeSelection.call(this, "Please enter an image URL", 'insertImage', 'http://');
		};

		taTools.insertLink.action = function() {
			makeSelection.call(this, "Please enter a URL to insert", 'createLink', 'http://');
		};

		return taTools;
	}]);
});

