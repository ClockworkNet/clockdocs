angular.module('Clockdoc.Controllers')
.controller('RdCtrl', ['$scope', '$location', 'FileSystem', 'Random',
function($scope, $location, FileSystem, Random) {

	var flagTypes = $scope.flagTypes = [
		{
			type: 'definition',
			name: 'Definition',
			title: ''
		},
		{
			type: 'open_question',
			name: 'Open Question',
			title: 'Open Question'
		},
		{
			type: 'assumption',
			name: 'Assumption',
			title: 'Assumption'
		}
	];

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

	function createFlag(type) {
		var flag = {};
		flagTypes.some(function(f) {
			if (f.type == type) {
				flag = f;
				return true;
			}
		});
		return {
			'title': flag.title,
			'guid': Random.id(),
			'type': flag.type,
			'content': ''
		};
	};

	// Finds an item by the specified GUID in an array.
	// If childKey is specified, this will recursive check
	// child arrays
	function findById(a, id, childKey) {
		if (!a || !a.some) {
			return null;
		}
		var item = null;
		a.some(function(o) {
			if (o.guid == id) {
				item = o;
				return true;
			}
			if (childKey && o[childKey]) {
				item = findById(o[childKey], id, childKey);
				return !!item;
			}
		});
		return item;
	};

	// Sorts a collection by GUID
	function sortById(a, ids) {
		a.sort(function(x, y) {
			var xix = ids.indexOf(x.guid);
			var yix = ids.indexOf(y.guid);
			return xix - yix;
		});
	};

	// Recursively access each feature in a section;
	// Until the callback returns false
	function eachItem(section, key, callback) {
		if (!section[key] || !section[key].some) return;
		section[key].some(function(f, i) {
			var go = callback(f, i, section[key]);
			if (go === false) {
				return true;
			}
			eachItem(f, key, callback);
		});
	}

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

	$scope.deleteFeature = function(section, feature) {
		eachItem(section, 'features', function(f, i, a) {
			if (f.guid != feature.guid) {
				return true;
			}
			$scope.$apply(function() {
				a.splice(i, 1);
				console.log("Deleted feature", f, "from section", section);
			});
			return false;
		});
	};

	$scope.insertFeature = function(features, featureIndex) {
		if (!features) {
			console.trace("Invalid features collection", arguments);
			return;
		}
		featureIndex = featureIndex || features.length + 1;
		features.splice(featureIndex, 0, createFeature());
		console.log($scope.rd);
	};

	$scope.insertFlag = function(flags, type) {
		flags.push(createFlag(type));
	};

	$scope.insertSection = function(sectionIndex) {
		$scope.rd.sections.splice(sectionIndex, 0, createFeature('Untitled Section'));
		console.log($scope.rd);
	};

	$scope.sortItems = function(collection, guids) {
		$scope.$apply(function() {
			sortById(collection, guids);
		});
	};
}]);
