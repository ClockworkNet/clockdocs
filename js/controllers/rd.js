angular.module('Clockdoc.Controllers')
.controller('RdCtrl', ['$scope', '$location', 'FileSystem', 'Random',
function($scope, $location, FileSystem, Random) {

	FileSystem.on('error', function(e) {
		console.error('File system error', e);
	});

	$scope.rd = null;

	$scope.create = function() {
		$scope.rd = {
			title: 'Untitled',
			author: 'Anonymous',
			created: new Date(),
			guid: Random.id(),
			sections: [],
		};
		console.log("Created rd", $scope.rd);
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

	$scope.insertFeature = function(featureIndex, parentFeature) {

	};

	$scope.insertSection = function(sectionIndex) {
		$scope.rd.sections.splice(sectionIndex, 0, {
			'title': 'Untitled Section',
			'guid': Random.id(),
			'content': '',
			'features': [],
			'flags': []
		});
	};

}]);
