/*global $:false, angular:false */
'use strict';

angular.module('Clockdoc.Directives')
// Adds angular binding to contenteditable elements
.directive('cwEditable', function() {
	return {
		restrict: 'A',
		require: '?ngModel',
		link: function($scope, el, attrs, ngModel) {
			if (!ngModel) {return;}

			if (!$scope.readonly) {
				el.attr('contenteditable', true);
			}

			$scope.$watch('readonly', function() {
				el.attr('contenteditable', !$scope.readonly);
			});

			ngModel.$render = function() {
				el.html(ngModel.$viewValue || '');
			};

			var update = function() {
				$scope.$apply(function() {
					ngModel.$setViewValue(el.html());
				});
			};

			el.on('blur keyup change', update);
		}
	};
});

// Configure the text-angular directive
angular.module('textAngular')
.config(function($provide){
	// Create some new options
	$provide.decorator('taOptions', ['taRegisterTool', '$delegate', function(taRegisterTool, taOptions) {
		var wrap = function(cmd) {
			return function() {
				this.$editor().wrapSelection(cmd);
			};
		};

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

		taOptions.toolbar = [
			['redo', 'undo', 'clear'],
			['pre', 'quote', 'subscript', 'superscript'],
			['bold', 'italics', 'underline', 'strikethrough'],
			['ul', 'ol'],
			['justifyLeft','justifyCenter','justifyRight', 'indent', 'outdent'],
			['insertImage', 'insertLink', 'html']
		];

		taOptions.classes.htmlEditor = 'ta-form-control';
		taOptions.classes.textEditor = 'ta-form-control';

		return taOptions;
	}]);

	// Updates some of the classes used for the buttons
	$provide.decorator('taTools', ['$delegate', '$q', 'Prompt', 'Ranger', function(taTools, $q, Prompt, Ranger) {

		taTools.html.iconclass = 'fa fa-code';
		delete taTools.html.buttontext;

		taTools.insertImage.action = function() {
			var selected = Ranger.save();
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

				Ranger.restore(selected);
				var html = '<img width="' + img.width + '" height="' + img.height + '" class="image ' + data.fileId + '" src="images/transparent.gif" />';
				return self.$editor().wrapSelection('insertHTML', html);
			});
			modal.show();
		};

		taTools.insertLink.action = function() {
			var self = this;
			var selected = Ranger.save();
			var p = new Prompt();

			p.title = 'Create a link';
			p.addField('url', 'Url', 'http://clockwork.net');
			p.show().then(function(vals) {
				Ranger.restore(selected);
				if (vals.url) {
					return self.$editor().wrapSelection('createLink', vals.url);
				}
				return false;
			});
		};

		return taTools;
	}]);
});

