/*global $:false, angular:false */
'use strict';

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
