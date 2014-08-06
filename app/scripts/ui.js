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
})
.service('Stylesheet', function() {
	this.get = function() {
		if (!document.styleSheets) {
			return this.create();
		}
		for (var i=0, stylesheet; stylesheet=document.styleSheets[i]; i++) {
			if (stylesheet.disabled) {
				continue;
			}
			var media = typeof(stylesheet.media) == 'object' 
				? stylesheet.media.mediaText
				: stylesheet.media;
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
	}
})

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
	};

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

	Prompt.prototype._shown = function(e) {
		this.values = {};
	}

	Prompt.prototype._hidden = function(e) {
		if (this.deferred) {
			this.deferred.resolve(this.values);
		}
	};

	Prompt.prototype.show = function() {
		this.bodyElement.empty();
		this.values = {};
		var form = $('<form>');
		this.fields.forEach(function(el, index) {
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
.factory('SelectedRange', ['$window', function($window) {
	function SelectedRange() {
		this.save();
	};

	SelectedRange.prototype.save = function() {
		this.selection = $window.getSelection();
		if (this.selection.rangeCount < 1) {
			this.range = null;
		}
		else {
			this.range = this.selection.getRangeAt(0).cloneRange();
		}
	};

	SelectedRange.prototype.wrap = function(o) {
		if (!this.range) return;
		this.range.surroundContents(o);
	};

	SelectedRange.prototype.insert = function(el) {
		if (!this.range) return;
		this.range.insertNode(el);
	};

	SelectedRange.prototype.restore = function() {
		this.selection.removeAllRanges();
		if (this.range) {
			this.selection.addRange(this.range);
		}
	};

	return SelectedRange;
}]);
