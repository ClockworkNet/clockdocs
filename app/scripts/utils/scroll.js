/*global $:false, angular:false */
'use strict';

// Utility methods for UI interactions
angular.module('Clockdoc.Utils')
.service('Scroll', function() {
	this.to = function(targetId, options) {
		options = options || {};
		var animate  = options.cwAnimate          || options.animate || false;
		var source   = options.cwScrollerSource   || options.source  || null;
		var padding  = options.cwScrollerPadding  || options.padding || 180;
		var speed    = options.cwScrollerSpeed    || options.speed   || 2; // Higher is slower
		var delay    = options.cwScrollerDelay    || options.delay   || 100; //ms
		var easing   = options.cwScrollerEasing   || options.easing  || 'linear';

		setTimeout(function() {
			var targetEl = $('#' + targetId);
			var offset   = targetEl && targetEl.offset();

			if (!offset) {
				console.error('Invalid scroller target id', targetId);
				return;
			}

			var destination = offset.top - padding;

			if (!animate) {
				$('body').scrollTop(destination);
				targetEl.focus();
				return;
			}

			var distance = source && source.offset ? Math.abs(source.offset().top - destination) : speed * padding;
			var time = distance / speed;

			$('body').animate({scrollTop: destination}, time, easing, function() {
				targetEl.focus();
			});
		}, delay);

		return false;
	};
});
