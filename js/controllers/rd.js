angular.module('Clockdoc.Controllers', ['Clockdoc.Utils'])
.controller('RdCtrl', ['$scope', '$location', 'FileSystem', 
function($scope, $location, FileSystem) {

	FileSystem.on('error', function(e) {
		console.error('File system error', e);
	});

	$scope.rd = null;

	$scope.create = function() {
		$scope.rd = {
			title: 'Untitled',
			author: 'Anonymous',
			created: new Date(),
		};
	};

	$scope.open = function() {
		FileSystem.open(['json'], function(contents, entry, progress) {
			$scope.$apply(function() {
				$scope.rd = angular.fromJson(contents);
				console.log("Set rd", $scope.rd);
			});
		});
	};

	$scope.save = function() {
		var rd = $scope.rd;
		FileSystem.save(rd.title, '.json', angular.toJson(rd), 'txt');
	};

}]);
