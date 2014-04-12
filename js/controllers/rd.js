angular.module('Clockdoc.Controllers', ['Clockdoc.Utils'])
.controller('RdCtrl', ['$scope', '$location', 'FileSystem', 
function($scope, $location, FileSystem) {

	FileSystem.on('error', function(e) {
		console.error('File system error', e);
	});

	$scope.rd = {};

	$scope.create = function() {
		$scope.rd = {
			title: 'Untitled',
			author: 'Anonymous',
			created: new Date(),
		};
	};

	$scope.open = function() {
		FileSystem.open(['json'], function(contents, entry, progress) {
			$scope.rd = angular.fromJson(contents);
			console.info($scope.rd);
		});
	};

}]);
