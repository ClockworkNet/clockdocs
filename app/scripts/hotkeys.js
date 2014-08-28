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
		console.log(e, commands);
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
			cmd.action();
		}
	}

	function register(data) {
		var commands = body.data(COMMANDS) || {};
		if (!commands[data.code]) {
			commands[data.code] = [];
		}
		commands[data.code].push(data);
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
			ctrl: '@ctrl',
			meta: '@meta',
			alt: '@alt',
			action: '&action'
		},
		link: init
	};
}]);
