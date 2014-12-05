/*global angular:false */
'use strict';

angular.module('Clockdoc.Directives')

// Watches scrolling on the page and generates a hierarchical breadcrumb
// based on the currently viewed feature or section
.directive('cwBreadcrumb', [function() {
	function Breadcrumb() {
		this.stack = [];
	}

	Breadcrumb.prototype.push = function(item) {
		this.stack.push(item);
	};

	Breadcrumb.prototype.pop = function() {

	};

	Breadcrumb.prototype.set = function(items) {
		this.stack = items;
	};

	return {
		restrict: 'E',
		link: function(scope, el, attrs) {
		}
	};
}])

.directive('cwBreadcrumbItem', ['cwBreadcrumb', function() {
	return {
		restrict: 'A',
		scope: {
			item: '=cwBreadcrumb'
		},
		link: function(scope, el, attrs) {
		}
	};
}]);
