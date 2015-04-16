/*global $:false, angular:false, Mustache:false */
'use strict';

angular.module('Clockdoc.Utils')
.factory('Templates', ['$q', '$http', '$filter', 'Ooxml', 'Feature', function($q, $http, $filter, Ooxml, Feature) {

	function Templates () {
		this.files = {};
		this.formats = {
			'word': {
				'extension': 'docx',
				'method': 'toWord'
			},
			'json': {
				'extension': 'json',
				'method': 'toJson'
			},
			'csv': {
				'extension': 'csv',
				'method': 'toCsv'
			}
		};
	}

	Templates.prototype.render = function(format, doc, source) {
		var data = this.formats[format];
		var method = data && data.method && this[data.method];
		var deferred = $q.defer();

		if (!method) {
			deferred.reject();
			return deferred.promise;
		}

		method.call(this, doc, source)
		.then(deferred.resolve.bind(this));

		return deferred.promise;
	};

	Templates.prototype.load = function(source) {
		var deferred = $q.defer();
		var self = this;

		if (this.files[source]) {
			deferred.resolve(this.files[source]);
			return deferred.promise;
		}

		function remember(rsp) {
			if (rsp.status !== 200) {
				deferred.reject(rsp);
				return;
			}
			self.files[source] = rsp.data;
			return deferred.resolve(rsp.data);
		}

		$http.get(source)
			.then(remember.bind(this))
			.catch(deferred.reject.bind(this));

		return deferred.promise;
	};

	/*
	 * Flattens out the document into one level. @todo: move this to the 
	 * RD model object
	 */
	Templates.prototype.flatten = function(doc) {
		var flat = angular.copy(doc);

		if (!flat.sections) {
			return flat;
		}

		var flattenNode = this.flattenNode.bind(this);

		flat.sections.forEach(function(section) {
			if (!section.features) {
				return;
			}
			var flattened = flattenNode(section.features, 'features');
			section.features = flattened;
		});
		return flat;
	};

	/**
	 * Replaces a recursive array with a one-level
	 * array and adds level information as a x.x.x numbering system
	 * system to the title key. Very useful for rendering without
	 * using recursion!
	**/
	Templates.prototype.flattenNode = function(a, childKey, levels) {
		var flattened = [];
		var flatter = this.flattenNode.bind(this);
		levels = levels || [];

		a.forEach(function(el, ix) {
			// Calculate the current level of this node
			var level = levels.slice(0);
			level.push(ix + 1);
			el.level = level.join('.');

			// The depth is bumped up by 1 to account for sections
			el.depth = level.length + 1;

			// Add to the flattened array
			flattened.push(el);

			// Add any children to the flattened array
			var children = el[childKey] ? el[childKey].slice(0) : [];
			var flatKids = flatter(children, childKey, level);
			flattened = flattened.concat(flatKids);
		});

		return flattened;
	};

	Templates.prototype.toWord = function(doc, source) {
		var prepared = this.flatten(doc);
		var ooxml = new Ooxml();
		var deferred = $q.defer();
		source = source || 'templates/word.xml';

		var format = function(a, callback) {
			if (!a) {
				return;
			}
			a.forEach(function(item, ix, self) {
				self[ix].content = ooxml.add(item.content);
				if (callback) {
					callback(item);
				}
			});
		};

		var fixFlags = function(flags) {
			if (!flags) {
				return;
			}
			flags.forEach(function(flag, ix, self) {
				var html = $('<div><b>' + flag.title + ': </b>' + flag.content + '</div>');
				self[ix].content = ooxml.add(html);
			});
		};

		format(prepared.sections, function(section) {
			fixFlags(section.flags);
			section.heading = ooxml.add(section.title, 'Heading1');
			var prefix = section.title[0];
			format(section.features, function(feature) {
				var heading = prefix + feature.level + ' ' + feature.title;
				if (feature.tags.indexOf('Removed') >= 0) {
					heading = '<div><strike>' + heading + '</strike></div>';
				}
				feature.heading = ooxml.add(heading, 'Heading' + feature.depth);
				feature.prefix = prefix;
				fixFlags(feature.flags);
			});
		});

		prepared.date = $filter('date')(new Date(), 'yyyy-MM-dd');
		prepared.relationships = ooxml.relationships;

		this.load('templates/word.xml')
		.then(function(src) {
			var output = Mustache.render(src, prepared);
			output = output.replace(/[\n\r\t]/gm, ' ')
				.replace(/>\s+</gm, '><');
			deferred.resolve(output);
		});

		return deferred.promise;
	};

	Templates.prototype.toJson = function(doc) {
		var deferred = $q.defer();
		var flat = this.flatten(doc);
		deferred.resolve(angular.toJson(flat, true));
		return deferred.promise;
	};

	Templates.prototype.toCsv = function(doc) {
		var deferred = $q.defer();
		var flat = this.flatten(doc);

		var rows = [['Identifier', 'Title']];
		for (var key in Feature.CostKeys) {
			rows[0].push(Feature.CostKeys[key]);
		}

		function toRow(id, title, cost) {
			var row = [];
			row.push('"' + id.replace('"', '\"') + '"');
			row.push('"' + title.replace('"', '\"') + '"');
			for (var key in Feature.CostKeys) {
				row.push(cost[key] || '');
			}
			return row.join(',');
		}

		for (var s=0; s<flat.sections.length; s++) {
			var section = flat.sections[s];
			var prefix  = section.title[0];
			rows.push(toRow('', section.title, []));

			for (var f=0; f<section.features.length; f++) {
				var feature = section.features[f];
				var id      = prefix + feature.level;
				rows.push(toRow(id, feature.title, feature.cost));
			}
		}

		var text = rows.join('\r');
		deferred.resolve(text);
		return deferred.promise;
	};

	return new Templates();
}]);
