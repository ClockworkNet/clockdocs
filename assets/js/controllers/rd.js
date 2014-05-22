angular.module('Clockdoc.Controllers')
.controller('RdCtrl', ['$scope', '$location', 'FileSystem', 'Random', 'Svn', 'Scroll', 'Platform', 'Stylesheet',
function($scope, $location, FileSystem, Random, Svn, Scroll, Platform, Stylesheet) {

	var extension = 'cw'

	$scope.rd = null;
	$scope.sorting = false;

	Platform.load($scope, 'platform');

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

	function addFileStyle(result) {
		Stylesheet.addRule(
			'.' + result.id, 
			'background-image: url(' + result.data + ')'
		);
	};

	function loadDoc(doc) {
		if (!doc.version) {
			doc.version = "0.1";
		}
		$scope.rd = doc;
		for (var id in doc.files) {
			if (!doc.files.hasOwnProperty(id)) continue;
			addFileStyle(doc.files[id]);
		}
	};

	function scrollTo(guid) {
		Scroll.to(guid);
	};

	function unwarn() {
		$scope.alert = {};
	};

	function warn(title, msg, type) {
		type = type || 'danger';
		$scope.alert = {
			type: type,
			title: title,
			content: msg
		};
		$('.alert').alert();
	};

	function createFeature(title) {
		title = title || 'Untitled';
		var feature = {
			'title': title,
			'guid': Random.id(),
			'content': '',
			'features': [],
			'flags': [],
			'tags': []
		};
		return feature;
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
	}

	// Creates a cache lookup to be used for getting 
	function findItem(id, parent) {
		if (!id) return null;
		parent = parent || $scope.rd;

		if (parent.guid == id) {
			return {
				index: 0,
				item: parent
			};
		}

		var checkChildren = function(a, type) {
			if (!a) return null;
			for (var i=0, o; o=a[i]; i++) {
				if (o.guid == id) {
					return {
						index: i,
						item: o,
						parent: {
							item: parent,
							type: type
						}
					};
				}
				var childItem = findItem(id, o);
				if (childItem) return childItem;
			}
			return null;
		};

		var childTypes = ['features', 'sections'];

		for (var i=0, ct; ct = childTypes[i]; i++) {
			var item = checkChildren(parent[ct], ct);
			if (item) return item;
		}

		return null;
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

	// Used to retain the result of a file open or SVN checkout
	$scope.result = {};

	/// Filesystem Methods ///
	FileSystem.on('error', function(e) {
		$scope.$apply(function() {
			return warn("Filesystem Error", "There was an error accessing the file system.");
		});
	});

	FileSystem.on('writing reading', function(result) {
		$scope.$apply(function() {
			$scope.working = true;
		});
	});

	FileSystem.on('write read', function(result) {
		$scope.$apply(function() {
			$scope.working = false;
			$scope.result = result;
		});
	});

	$scope.create = function() {
		var doc = {
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
doc.sections[1].features.push(createFeature('Apple'));
doc.sections[1].features[0].features.push(createFeature('Red Apple'));
doc.sections[1].features[0].features.push(createFeature('Green Apple'));
doc.sections[1].features.push(createFeature('Orange'));
doc.sections[1].features[1].features.push(createFeature('Blue Orange'));
doc.sections[1].features[1].features.push(createFeature('Orangatang'));
doc.sections[1].features[1].features[0].features.push(createFeature('Tang'));
doc.sections[1].features[1].features[0].features.push(createFeature('Nectarine'));
doc.sections[1].features.push(createFeature('Banana'));
		loadDoc(doc);
		$scope.result = {};
	};

	$scope.open = function() {
		var readResult = function(result) {
			FileSystem.read(result)
			.then(function(result) {
				if (!result && !result.content) {
					return;
				}
				try {
					loadDoc(angular.fromJson(result.content));
					$scope.result = result;
				}
				catch (e) {
					console.error('file open error', e);
					warn("Error opening file", "There is a problem with your file. " + e);
				}
			});
		}

		FileSystem.openFile([extension, 'json'])
		.then(readResult);
	};

	/// SVN ///
	$scope.svnInstalled = false;

	Svn.test().then(function(rsp) {
		$scope.svnInstalled = true;
	});

	Svn.on('error', function(e) {
		$scope.$apply(function() {
			console.error('SVN error', e);
			warn("A SVN error occurred.", "Check the console log for details.");
		});
	});

	Svn.on('executing', function(args) {
		$scope.$apply(function() {
			$scope.working = true;
			warn("Running", args.join(' '), "info");
		});
	});

	Svn.on('read checkout', function(result) {
		console.info("Read from SVN", result);

		$scope.$apply(function() {
			$scope.working = false;
			$scope.result = result;
			try {
				loadDoc(angular.fromJson(result.content));
				unwarn();
			}
			catch (e) {
				console.error("Error reading file", e, result);
				warn("File error", "There was an error reading the SVN file. Check the console log for details");
			}
		});
	});

	Svn.on('commit', function(result) {
		$scope.$apply(function() {
			$scope.working = false;
			$scope.result = result;
			warn("Committed", "changes committed to SVN", "success");
		});
	});

	$scope.openSvn = function() {
		Svn.open($scope.result.svn.URL);
	};

	$scope.checkout = function() {
		Svn.checkout($scope.result.svn.URL);
	};

	$scope.installSvn = function() {
		Svn.install().then(function() {
			$scope.working = false;
			$scope.svnInstalled = true;
		}, function() {
			// installation was cancelled
			$scope.working = false;
		});
	};

	$scope.commit = function() {
		$scope.result.content = angular.toJson($scope.rd, true);
		Svn.commit($scope.result);
	};

	$scope.save = function() {
		if (!$scope.result.entryId) {
			$scope.saveAs();
			return;
		}
		var content = angular.toJson($scope.rd, true);
		FileSystem.save($scope.result.entryId, content);
	};

	$scope.saveAs = function() {
		var rd = $scope.rd;
		FileSystem.saveAs(rd.title, extension, angular.toJson(rd, true));
	};

	/// Section methods ///
	$scope.insertSection = function(sectionIndex) {
		var section = createFeature('Untitled Section');
		$scope.rd.sections.splice(sectionIndex, 0, section);
		scrollTo(section.guid);
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

		scrollTo(feature.guid);
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
		var flag = createFlag(type);
		flags.push(flag);
		scrollTo(flag.guid);
	};

	$scope.deleteFlag = function(flags, index) {
		$scope.$apply(function() {
			flags.splice(index, 1);
		});
	};

	$scope.moveItem = function(parentGuid, guid, newIndex) {
		// Find the item being moved
		var moved = findItem(guid);
		if (!moved) {
			console.error("Invalid moved item id", guid);
			return;
		}

		// Get the containing object where the item was dropped
		var parent = findItem(parentGuid || $scope.rd.guid);
		if (!parent) {
			console.error("Could not find drop parent in rd", parentGuid);
			return;
		}
		var targetType = parent.item.guid == $scope.rd.guid ? 'sections' : 'features';

		$scope.$apply(function() {
			// Out with the old
			moved.parent.item[moved.parent.type].splice(moved.index, 1);

			// In with the new
			parent.item[targetType].splice(newIndex, 0, moved.item);
		});
	};

	$scope.print = function() {
		window.print();
	};

	$scope.addFile = function(result) {
		if (!$scope.rd.files) {
			$scope.rd.files = {};
		}
		result.id = Random.id();
		$scope.rd.files[result.id] = result;
		addFileStyle(result);
	};

	$scope.removeFile = function(id) {
		if (!$scope.rd.files) return;
		delete $scope.rd.files[id];
	};
}]);
