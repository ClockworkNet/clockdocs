/*global angular:false */
'use strict';

// Utility methods for UI interactions
angular.module('Clockdoc.Utils')
.service('Stylesheet', function() {
	this.get = function() {
		if (!document.styleSheets) {
			return this.create();
		}
		for (var i=0; i<document.styleSheets.length; i++) {
			var stylesheet = document.styleSheets[i];
			if (stylesheet.disabled) {
				continue;
			}
			var media = stylesheet.media;
			if (typeof(media) === 'object') {
				media = media.mediaText;
			}
			if (media.indexOf('screen') >= 0) {
				return stylesheet;
			}
		}
		return this.create();
	};

	this.create = function() {
		var sse = document.createElement('style');
		sse.type = 'text/css';
		document.getElementsByTagName('head')[0].appendChild(sse);
		return document.styleSheets[document.styleSheets.length - 1];
	};

	this.addRule = function(selector, style) {
		var stylesheet = this.get();
		stylesheet.addRule(selector, style);
	};
});
