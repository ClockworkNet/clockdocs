angular.module('Clockdoc.Controllers')
.controller('RdCtrl', ['$scope', '$location', 'FileSystem', 'Random',
function($scope, $location, FileSystem, Random) {

	FileSystem.on('error', function(e) {
		console.error('File system error', e);
	});

	function createFeature(title) {
		title = title || 'Untitled';
		return {
			'title': title,
			'guid': Random.id(),
			'content': '',
			'features': [],
			'flags': []
		};
	};

	$scope.rd = null;

	$scope.create = function() {
		$scope.rd = {
			title: 'Untitled Requirements Document',
			author: 'Anonymous',
			created: new Date(),
			guid: Random.id(),
			revisions: [],
			sections: [
				createFeature('Definitions and Conventions'),
				createFeature('Features'),
				createFeature('Production'),
				createFeature('Technology'),
				createFeature('Security')
			],
			flags: []
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

	$scope.insertFeature = function(features, featureIndex) {
		if (!features) {
			console.trace("Invalid features collection");
			return;
		}
		features.splice(featureIndex, 0, createFeature());
	};

	$scope.insertSection = function(sectionIndex) {
		$scope.rd.sections.splice(sectionIndex, 0, createFeature('Untitled Section'));
	};

}]);
