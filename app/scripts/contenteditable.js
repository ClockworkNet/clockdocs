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
			['pre', 'quote', 'subscript', 'superscript'],
			['bold', 'italics', 'underline', 'strikethrough'],
			['ul', 'ol'],
			['justifyLeft','justifyCenter','justifyRight', 'indent', 'outdent'],
			['html', 'insertImage', 'insertLink']
		];

		taOptions.classes.htmlEditor = 'form-control';
		taOptions.classes.textEditor = 'form-control';

		return taOptions;
	}]);

	// Updates some of the classes used for the buttons
	$provide.decorator('taTools', ['$delegate', '$q', function(taTools, $q) {

		console.debug(taTools);

		taTools.html.iconclass = 'fa fa-code';
		delete taTools.html.buttontext;

		function getSelectedNode() {
			var selection = window.getSelection();
			return selection && selection.focusNode;
		};

		function restoreSelectedNode(selectedNode) {
			if (!selectedNode) return;
			var currentSelection = window.getSelection();
			var range = document.createRange();
			range.selectNodeContents(selectedNode);
			currentSelection.addRange(range);
		};

		function makeSelection(msg, cmd, placeholder) {
			var self = this;
			var selectedNode = getSelectedNode();
			placeholder = placeholder || '';
			window.prompt(msg, placeholder, function(val) {
				restoreSelectedNode(selectedNode);
				if (!val || !val.length || val == placeholder) return;
				return self.$editor().wrapSelection(cmd, val);
			});
		};

		taTools.insertImage.action = function() {
			var selectedNode = getSelectedNode();
			var modal = $('#doc-library');
			var self = this;

			modal.modal('show');
			modal.one('click', '.caption', function(e) {
				var data = $(e.currentTarget).data();
				if (!data) {
					console.info('No data found', e);
					return;
				}

				var img = new Image();
				img.src = data.fileData;

				restoreSelectedNode(selectedNode);
				var selection = getSelectedNode();
				var html = '<img width="' + img.width + '" height="' + img.height + '" class="image ' + data.fileId + '" src="assets/img/transparent.gif" />';
				console.info(html);
				return self.$editor().wrapSelection('insertHTML', html);
			});
			modal.show();
		};

		taTools.insertLink.action = function() {
			makeSelection.call(this, "Please enter a URL to insert", 'createLink', 'http://');
			return false;
		};

		return taTools;
	}]);
});

