/*global $:false, angular:false */
'use strict';

angular.module('Clockdoc.Directives')

// Adds a click event to an element that will scroll the window
// to the specified target (and select all text)
.directive('cwHotkey', [function() {
	var body = $('body');

	var NS = '.cw.hotkeys';
	var STARTED = 'started' + NS;
	var COMMANDS = 'commands' + NS;

	function keyed(e) {
		var commands = body.data(COMMANDS),
			keyCode = e.keyCode;
		if (!commands || !commands[keyCode]) {
			return;
		}
		for (var i=0; i<commands[keyCode].length; i++) {
			var cmd = commands[keyCode][i];
			if (cmd.ctrl && !e.ctrlKey) {
				continue;
			}
			if (cmd.alt && !e.altKey) {
				continue;
			}
			if (cmd.meta && !e.metaKey) {
				continue;
			}
			var action = cmd.action.bind(cmd.$parent);
			cmd.$apply(action);
		}
	}

	function register(scope) {
		var commands = body.data(COMMANDS) || {};
		var code = scope.code || scope.key.charCodeAt(0);
		if (!commands[code]) {
			commands[code] = [];
		}
		commands[code].push(scope);
		body.data(COMMANDS, commands);
	}

	function start() {
		if (body.data(STARTED)) {
			return;
		}
		body.data(STARTED, true);
		body.on('keydown', keyed);
	}

	function end() {
		body.off(NS);
		body.data(STARTED, false);
	}

	function init(scope, element) {
		start();
		register(scope);
		element.on('$destroy', end);
	}

	return {
		restrict: 'E',
		scope: {
			code: '@code',
			key: '@key',
			ctrl: '@ctrl',
			meta: '@meta',
			alt: '@alt',
			action: '&action'
		},
		link: init
	};
}]);
