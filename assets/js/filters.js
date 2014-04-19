angular.module('Clockdoc.Filters', ['Clockdoc.Utils'])
.filter('truncate', function() {
	return function(input, len) {
		len = len || 100;
		if (input.length < len) return input;
		return input.substr(0, len - 3) + '...';
	};
})
.filter('abbr', function() {
	return function(input) {
		return input.replace(/[^a-z0-9]/gi, '-').toLowerCase();
	};
});
