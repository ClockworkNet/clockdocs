/*global angular:false */
'use strict';

angular.module('Clockdoc.Models')
.factory('Feature', ['Random', function(Random) {

	function Feature(data) {
		this.title     = data.title     || 'Untitled';
		this.guid      = data.guid      || Random.id();
		this.cost      = data.cost      || {};
		this.content   = data.content   || '';
		this.flags     = data.flags     || [];
		this.tags      = data.tags      || [];
		this.costKeys  = data.costKeys  || Feature.CostKeys;

		this.setFeatures(data.features);

		Object.defineProperty(this, 'collapsed', {
			value      : false,
			writable   : true,
			enumerable : false
		});
	}

	Feature.CostKeys = {
		'all'         : 'Overall',
		'design'      : 'Design',
		'development' : 'Development',
		'production'  : 'Production',
		'testing'     : 'Testing',
		'ux'          : 'User Experience'
	};

	// Recursively create child features.
	Feature.prototype.setFeatures = function(features) {
		this.features = [];

		if (!features || !features.length) {
			return;
		}

		for (var i=0; i<features.length; i++) {
			this.features[i] = new Feature(features[i]);
		}
	};

	// Recursively iterate over this feature's children
	// If the callback returns false, the iteration will end
	Feature.prototype.eachFeature = function(callback, level) {
		level = level || 0;
		for (var i=0; i<this.features.length; i++) {
			var go = callback(this.features[i], i, this.features, level);
			if (go === false) {
				return;
			}
			this.features[i].eachFeature(callback, level + 1);
		}
	};

	Feature.prototype.newCost = function(key, value) {
		key = key || 'all';
		this.cost[key] = value || 0;
	};

	Feature.prototype.updateCostKey = function(oldKey, newKey) {
		var value = this.cost[oldKey];
		this.cost[newKey] = value;
		delete this.cost[oldKey];
	};

	Feature.prototype.removeCost = function(key) {
		delete this.cost[key];
	};

	Feature.prototype.totalCost = function() {
		var total = 0;

		for (var key in this.cost) {
			total += this.cost[key];
		}

		for (var i=0; i<this.features.length; i++) {
			total += this.features[i].totalCost();
		}

		return total;
	};


	Feature.prototype.hasTag = function(tag) {
		return this.tags && this.tags.indexOf(tag) >= 0;
	};

	return Feature;
}]);
