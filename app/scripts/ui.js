/*global $:false, angular:false */
'use strict';

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
				console.error('Invalid scroller target id', targetId);
				return;
			}

			var destination = offset.top - padding;
			var distance = source && source.offset ? Math.abs(source.offset().top - destination) : speed * padding;
			var time = distance / speed;

			$('body').animate({scrollTop: destination}, time, function() {
				targetEl.focus();
			});
		}, delay);

		return false;
	};
})
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

angular.module('Clockdoc.Utils')
.factory('Prompt', ['$q', function($q) {
	function Prompt() {
		this.title = '';

		// include a key, label, placeholder
		this.fields = [];

		// Maps to the keys provided by the fields object
		this.values = {};

		this.dialog = $('#prompt');
		this.titleElement = this.dialog.find('.modal-title');
		this.bodyElement = this.dialog.find('.modal-body');

		this.cancelButton = this.dialog.find('.btn-cancel');
		this.actionButton = this.dialog.find('.btn-action');

		this.dialog.off('.prompt');
		this.dialog.off('.bs.modal');

		this.dialog.on('click.prompt', '.btn-action', this.accept.bind(this));
		this.dialog.on('click.prompt', '.btn-cancel', this.cancel.bind(this));
		this.dialog.on('keyup.prompt', ':input', this._checkEnter.bind(this));

		this.dialog.on('shown.bs.modal', this._shown.bind(this));
		this.dialog.on('hidden.bs.modal', this._hidden.bind(this));
	}

	Prompt.prototype.addField = function(key, title, placeholder) {
		var id = 'prompt-' + key;

		var input = $('<input>')
			.attr('placeholder', placeholder)
			.attr('id', id)
			.attr('name', key)
			.addClass('form-control')
		;

		var label = $('<label>')
			.html(title)
			.attr('for', id)
		;

		var field = {
			id: id,
			key: key,
			label: label,
			placeholder: placeholder,
			input: input
		};

		this.values[key] = '';
		this.fields.push(field);

		return field;
	};

	Prompt.prototype._checkEnter = function(e) {
		if (e.which === 13) {
			this.accept();
		}
	};

	Prompt.prototype._shown = function() {
		this.values = {};
	};

	Prompt.prototype._hidden = function() {
		if (this.deferred) {
			this.deferred.resolve(this.values);
		}
	};

	Prompt.prototype.show = function() {
		this.bodyElement.empty();
		this.values = {};
		var form = $('<form>');
		this.fields.forEach(function(el) {
			var holder = $('<div>');
			holder.addClass('form-group');
			holder.append(el.label);
			holder.append(el.input);
			form.append(holder);
		});
		this.bodyElement.append(form);

		this.titleElement.html(this.title);
		this.cancelButton.toggle(!this.hideCancel);

		this.deferred = $q.defer();

		this.dialog.modal('show');

		return this.deferred.promise;
	};

	Prompt.prototype.accept = function() {
		var values = {};
		this.fields.forEach(function(el) {
			values[el.key] = el.input.val();
		});
		this.values = values;
		this.dialog.modal('hide');
	};

	Prompt.prototype.cancel = function() {
		this.values = {};
		this.dialog.modal('hide');
	};

	return Prompt;
}]);

angular.module('Clockdoc.Utils')
.service('Ranger', ['$window', 'Random', function($window, Random) {
	this.insertMarker = function(range, atStart) {
		var bound = range.cloneRange();
		bound.collapse(atStart);

		var span = $window.document.createElement('span');
		span.id = Random.id();
		span.className = 'selectedRangeMarker';

		bound.insertNode(span);
		return span.id;
	};

	this.wrapRangeWithMarkers = function(range) {
		var startId = this.insertMarker(range, true);
		var endId = this.insertMarker(range, false);
		return {
			startId: startId,
			endId: endId
		};
	};

	this.removeElement = function(id) {
		var el = $window.document.getElementById(id);
		if (el && el.parentNode) {
			el.parentNode.removeChild(el);
		}
	};

	this.unwrapMarkers = function(token) {
		if (!token || !token.markers) {
			return;
		}
		this.removeElement(token.markers.startId);
		this.removeElement(token.markers.endId);
	};

	this.getRange = function() {
		var selection = $window.getSelection();
		if (selection.rangeCount === 0) {
			return null;
		}
		return selection.getRangeAt(0);
	};

	this.save = function() {
		var range = this.getRange();
		if (!range) {
			return null;
		}
		var text = range.toString();
		var markers = this.wrapRangeWithMarkers(range);
		return {
			markers: markers,
			text: text
		};
	};

	this.restore = function(token) {
		if (!token) {return;}
		var range = $window.document.createRange();

		var start = $window.document.getElementById(token.markers.startId);
		range.setStartBefore(start);

		var end = $window.document.getElementById(token.markers.endId);
		range.setEndBefore(end);

		this.unwrapMarkers(token);

		var selection = $window.getSelection();
		selection.removeAllRanges();
		selection.addRange(range);
	};
}]);
