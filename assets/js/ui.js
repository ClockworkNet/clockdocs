// Utility methods for UI interactions
angular.module('Clockdoc.Utils')
.service('Scroll', function() {
	this.to = function(targetId, options) {
		options = options || {};
		var source   = options.cwScrollerSource   || options.source  || null;
		var padding  = options.cwScrollerPadding  || options.padding || 120;
		var speed    = options.cwScrollerSpeed    || options.speed   || 1;
		var delay    = options.cwScrollerDelay    || options.delay   || 100; //ms

		setTimeout(function() {
			var targetEl = $('#' + targetId);
			var offset   = targetEl && targetEl.offset();

			if (!offset) {
				console.error("Invalid scroller target id", targetId);
				return;
			}

			var destination = offset.top - padding;
			var distance = source && source.offset ? Math.abs(source.offset().top - destination) : speed * padding;
			var time = distance / speed;

			$('body').animate({scrollTop: destination}, time, function() {
				targetEl.focus();
				document.execCommand('selectAll', false, null);
			});
		}, delay);

		return false;
	}
});

window.prompt = function(text, value, callback) {
	var modal = $('#prompt');
	var input = modal.find('.modal-value').val(value);

	modal.find('.modal-title').html(text);
	modal.modal('show');

	if (callback) {
		modal.find('.btn-cancel').show();
		modal.one('click', '.btn-action', function() {
			callback(input.val());
		});
	}
	else {
		modal.find('.btn-cancel').hide();
	}

	return modal;
};
