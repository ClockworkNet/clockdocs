/*global angular:false */
'use strict';

angular.module('Clockdoc.Models')
.factory('Feature', ['Random', function(Random) {

	function Feature(data) {
		this.title    = data.title    || 'Untitled';
		this.guid     = data.guid     || Random.id();
		this.cost     = data.cost     || 0;
		this.content  = data.content  || '';
		this.flags    = data.flags    || [];
		this.tags     = data.tags     || [];
		this.setFeatures(data.features);
	}

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

	Feature.prototype.totalCost = function() {
		var total = this.cost || 0;
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
