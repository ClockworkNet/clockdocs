angular.module('Clockdoc.Controllers')
.controller('RdCtrl', ['$scope', '$location', 'FileSystem', 'Random', 'Svn',
function($scope, $location, FileSystem, Random, Svn) {

	$scope.version = '1.1';

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

	var availableTags = $scope.availableTags = [
		"Out of Scope", 
		"Future Phase"
	];

	function warn(title, msg, type) {
		type = type || 'danger';
		$scope.alert = {
			type: type,
			title: title,
			content: msg
		};
		$('.alert').alert();
	}

	function createFeature(title) {
		title = title || 'Untitled';
		return {
			'title': title,
			'guid': Random.id(),
			'content': '',
			'features': [],
			'flags': [],
			'tags': []
		};
	}

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
	}

	var cache = {};

	// Finds an item by the specified GUID in an array.
	// If childKey is specified, this will recursive check
	// child arrays
	function findById(a, id, childKey) {
		if (cache[id]) return cache[id];
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
		cache[id] = item;
		return item;
	}

	// Sorts a collection by GUID
	function sortById(a, ids) {
		if (!ids) return;
		a.sort(function(x, y) {
			var xix = ids.indexOf(x.guid);
			var yix = ids.indexOf(y.guid);
			return xix - yix;
		});
	}

	// Recursively access each feature in a section;
	// Until the callback returns false
	function eachItem(section, key, callback, level) {
		if (!section[key] || !section[key].some) return;
		level = level || 0;
		section[key].some(function(f, i) {
			var go = callback(f, i, section[key], level);
			if (go === false) {
				return true;
			}
			eachItem(f, key, callback, level + 1);
		});
	}

	// The rd being edited
	$scope.rd = null;

	// Used to retain the opened file entry for saving.
	$scope.fileEntry = null;
	$scope.fileEntryId = null;

	// The svn info associated with an entry
	$scope.svn = {};

	/// Filesystem Methods ///
	FileSystem.on('error', function(e) {
		return warn("Filesystem Error", "There was an error accessing the file system.");
	});

	FileSystem.on('read', function(result) {
		console.info('read file', result);
		if (!result.content) {
			return;
		}
		$scope.$apply(function() {
			try {
				$scope.rd = angular.fromJson(result.content);
				$scope.fileEntry = result.entry;
				$scope.fileEntryId = result.entryId;
				$scope.svn = {};
			}
			catch (e) {
				console.error('file open error', e);
				warn("Error opening file", "There is a problem with your file. " + e);
			}
		});
	});

	FileSystem.on('writing', function(result) {
		console.info('saving...', result);
		$scope.working = true;
	});

	FileSystem.on('write', function(result) {
		console.info('write file', result);
		$scope.$apply(function() {
			$scope.working = false;
			$scope.fileEntry = result.entry;
			$scope.fileEntryId = result.entryId;
			$scope.svn = null;
		});
	});

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
		$scope.fileEntry = null;
		$scope.fileEntryId = null;
		$scope.svn = {};
	};

	$scope.open = function() {
		FileSystem.open(['json']);
	};

	/// SVN ///
	Svn.on('error', function(e) {
		$scope.$apply(function() {
			warn("SVN error", "An error occurred with SVN: " + e);
		});
	});

	Svn.on('executing', function(args) {
		$scope.working = true;
		console.log("Executing", args);
	});

	Svn.on('read', function(result) {
		console.info("Read from SVN", result);

		$scope.$apply(function() {
			$scope.working = false;
			$scope.fileEntry = null;
			$scope.fileentryId = null;

			$scope.svn = {info: result.info};
			$scope.rd = angular.fromJson(result.content);
		});
	});

	Svn.on('commit', function(result) {
		$scope.$apply(function() {
			$scope.working = false;
			$scope.fileEntry = null;
			$scope.fileentryId = null;
		});
	});

	$scope.checkout = function() {
		Svn.open($scope.svn.info.URL);
	};

	$scope.commit = function() {
		Svn.commit($scope.rd, $scope.svn.info);
	};

	$scope.save = function() {
		if (!$scope.fileEntryId) {
			$scope.saveAs();
			return;
		}
		var content = angular.toJson($scope.rd, true);
		FileSystem.save($scope.fileEntryId, content);
	};

	$scope.saveAs = function() {
		var rd = $scope.rd;
		FileSystem.saveAs(rd.title, 'json', angular.toJson(rd, true), 'txt');
	};

	/// Section methods ///
	$scope.insertSection = function(sectionIndex) {
		$scope.rd.sections.splice(sectionIndex, 0, createFeature('Untitled Section'));
	};

	$scope.deleteSection = function(index) {
		$scope.$apply(function() {
			$scope.rd.sections.splice(index, 1);
		});
	};

	/// Feature methods ///
	$scope.deleteFeature = function(section, feature) {
		eachItem(section, 'features', function(f, i, a) {
			if (f.guid != feature.guid) {
				return true;
			}
			$scope.$apply(function() {
				a.splice(i, 1);
			});
			return false;
		});
	};

	$scope.insertFeature = function(features, featureIndex) {
		if (!features) {
			console.trace("Invalid features collection", arguments);
			return warn("Error adding feature", "The 'features' collection was empty. You may have an invalid file.");
		}
		var feature = createFeature();
		featureIndex = featureIndex || features.length + 1;
		features.splice(featureIndex, 0, feature);

		$('#' + feature.guid).focus();
		document.execCommand('selectAll', false, null);
	};

	/// Tag methods ///
	var featureHasTag = $scope.featureHasTag = function(feature, tag) {
		return feature.tags && feature.tags.indexOf(tag) >= 0;
	};

	$scope.toggleTag = function(feature, tag) {
		if (featureHasTag(feature, tag)) {
			removeTag(feature, tag);
		}
		else {
			addTag(feature, tag);
		}
	};

	var addTag = $scope.addTag = function(feature, tag) {
		if (!feature.tags) {
			feature.tags = [];
		}
		feature.tags.push(tag);
	};

	var removeTag = $scope.removeTag = function(feature, tag) {
		feature.tags = feature.tags.filter(function(t) {
			return tag != t;
		});
	};

	/// Flag methods ///
	$scope.insertFlag = function(flags, type) {
		if (!flags) {
			return warn("Error adding flag", "The 'flags' colleciton was empty.");
		}
		flags.push(createFlag(type));
	};

	$scope.deleteFlag = function(flags, index) {
		$scope.$apply(function() {
			flags.splice(index, 1);
		});
	};

	$scope.sortItems = function(collection, guids) {
		$scope.$apply(function() {
			sortById(collection, guids);
		});
	};

	$scope.print = function() {
		window.print();
	};
}]);
