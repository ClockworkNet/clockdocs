/*global angular:false */
'use strict';

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
		range = range || this.getRange();
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
