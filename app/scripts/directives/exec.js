/*global $:false, angular:false */
'use strict';

angular.module('Clockdoc.Directives')

// Executes one or more content editing commands on the target specified
// with the exec-target attribute
.directive('exec', function() {
	return {
		restrict: 'A',
		link: function(scope, el, attrs) {
			el.on('click', function() {
				var cmds = attrs.exec.split(' ');
				var target = $(attrs.execTarget);
				if (target) {
					target.focus();
					target.select();
				}
				document.execCommand('selectAll', false, null);
				cmds.forEach(function(cmd) {
					document.execCommand(cmd, false, null);
				});
				if (target) {target.blur();}
			});
		}

	};
});
