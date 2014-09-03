/*global $:false, angular:false */
'use strict';

angular.module('Clockdoc.Controllers')
.controller('RdCtrl', ['$scope', '$filter', '$timeout', 'FileSystem', 'Storage', 'Random', 'Svn', 'Scroll', 'Platform', 'Stylesheet', function($scope, $filter, $timeout, FileSystem, Storage, Random, Svn, Scroll, Platform, Stylesheet) {

	var EXTENSION = 'cw';
	var ALERT_TIME = 5000;

	var RECENT_ENTRIES = 'recent_entries';
	var RECENT_ENTRIES_MAX = 5;

	$scope.rd = null;
	$scope.sorting = false;
	$scope.recentEntries = [];

	Platform.load($scope, 'platform');

	var storage = new Storage();

	function unique(a, key) {
		var seen = {}, u = [];
		a.forEach(function(item) {
			var value = item[key];
			if (seen[value]) {
				return;
			}
			seen[value] = 1;
			u.push(item);
		});
		return u;
	}

	// Load up the initial set of recent entries
	storage.get(RECENT_ENTRIES)
	.then(function(results) {
		$scope.recentEntries = unique(results, 'entryId');
	});

	/**
	 *¬Forgets the specified entry and shows an error message
	**/
	function forgetEntry(entryId, e) {
		$scope.recentEntries = $scope.recentEntries.filter(function(r) {
			return r.entryId !== entryId;
		});
		$scope.result = null;
		storage.set(RECENT_ENTRIES, $scope.recentEntries);
		console.error('file error', e);
		warn('Error', 'There was a problem opening your file.');
	}

	/**
	 * Remembers a recent entry into storage¬
	**/
	function rememberEntry() {
		if (!$scope.result || !$scope.result.entryId) {
			return;
		}

		var entries = $scope.recentEntries;

		if (!entries) {
			entries = [];
		}

		var newEntry = {
			entryId: $scope.result.entryId,
			name: $scope.result.entry.name,
			date: new Date()
		};

		// Add the entry to the top
		entries.splice(0, 0, newEntry);

		// Trim the array of entries
		entries = unique(entries, 'entryId').slice(0, RECENT_ENTRIES_MAX);

		storage.set(RECENT_ENTRIES, entries)
			.then(function() {
				$scope.recentEntries = entries;
			});
	}

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

	$scope.availableTags = [
		'Out of Scope',
		'Future Phase'
	];

	function addFileStyle(result) {
		Stylesheet.addRule(
			'.' + result.id,
			'background-image: url(' + result.data + ')'
		);
	}

	function getSampleDoc(type) {
		if (type === 'rd') {
			return {
				title: 'Untitled Requirements Document',
				author: 'Anonymous',
				created: new Date(),
				guid: Random.id(),
				revisions: [$scope.exampleRevision()],
				sections: [
					createFeature('Definitions and Conventions'),
					createFeature('Features'),
					createFeature('Production'),
					createFeature('Technology'),
					createFeature('Security')
				],
				flags: []
			};
		}
		return {
			title: 'Untitled Requirements Document',
			author: 'Anonymous',
			created: new Date(),
			guid: Random.id(),
			revisions: [],
			sections: []
		};
	}

	function loadDoc(doc) {
		$scope.rd = doc;
		for (var id in doc.files) {
			if (!doc.files.hasOwnProperty(id)) {continue;}
			addFileStyle(doc.files[id]);
		}
	}

	function unwarn() {
		$scope.alert = {};
	}

	function warn(title, msg, type) {
		type = type || 'danger';
		$scope.alert = {
			type: type,
			title: title,
			content: msg
		};
		$('.alert').alert();
		$timeout(unwarn, ALERT_TIME);
	}

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
	}

	function createFlag(type) {
		var flag = {};
		flagTypes.some(function(f) {
			if (f.type === type) {
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
		if (!id) {return null;}
		parent = parent || $scope.rd;

		if (parent.guid === id) {
			return {
				index: 0,
				item: parent
			};
		}

		var checkChildren = function(a, type) {
			if (!a) {return null;}
			for (var i=0; i<a.length; i++) {
				var o = a[i];
				if (o.guid === id) {
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
				if (childItem) {return childItem;}
			}
			return null;
		};

		var childTypes = ['features', 'sections'];

		for (var i=0; i<childTypes.length; i++) {
			var ct = childTypes[i];
			var item = checkChildren(parent[ct], ct);
			if (item) {return item;}
		}

		return null;
	}

	// Recursively access each feature in a section;
	// Until the callback returns false
	function eachItem(section, key, callback, level) {
		if (!section[key] || !section[key].some) {return;}
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
	$scope.create = function() {
		var doc = getSampleDoc('rd');
		loadDoc(doc);
		$scope.result = {};
	};

	$scope.open = function(entryId) {
		var readResult = function(result) {
			FileSystem.read(result)
			.then(function(result) {
				$scope.working = false;
				if (!result || !result.content) {
					return;
				}
				try {
					loadDoc(angular.fromJson(result.content));
					$scope.result = result;
					rememberEntry(true);
				}
				catch (e) {
					console.error('file open error', e);
					warn('Error', 'There is a problem with your file.');
				}
			});
		};

		var onError = forgetEntry.bind(null, entryId);
		$scope.working = true;
		if (entryId) {
			FileSystem.restore(entryId)
			.then(readResult, onError);
		}
		else {
			FileSystem.openFile([EXTENSION, 'json'])
			.then(readResult, onError);
		}
	};

	/// SVN ///
	$scope.svnInstalled = false;

	Svn.test().then(function() {
		$scope.svnInstalled = true;
	});

	Svn.on('error', function(e) {
		$scope.$apply(function() {
			console.error('SVN error', e);
			warn('A SVN error occurred.', 'Check the console log for details.');
		});
	});

	Svn.on('executing', function(args) {
		$scope.$apply(function() {
			$scope.working = true;
			warn('Running', args.join(' '), 'info');
		});
	});

	Svn.on('read checkout', function(result) {
		console.info('Read from SVN', result);

		$scope.$apply(function() {
			$scope.working = false;
			$scope.result = result;
			try {
				loadDoc(angular.fromJson(result.content));
				unwarn();
			}
			catch (e) {
				console.error('Error reading file', e, result);
				warn('File error', 'There was an error reading the SVN file. Check the console log for details');
			}
		});
	});

	Svn.on('commit', function(result) {
		$scope.$apply(function() {
			$scope.working = false;
			$scope.result = result;
			warn('Committed', 'changes committed to SVN', 'success');
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
		var showMsg = warn.bind(this, 'Saved', $scope.result.entry.name, 'info');
		var errMsg = warn.bind(this, 'Error', $scope.result.entry.name + ' could not be saved');
		var content = angular.toJson($scope.rd, true);
		FileSystem.save($scope.result.entryId, content)
			.then(rememberEntry, errMsg)
			.then(showMsg);
	};

	$scope.saveAs = function() {
		var rd = $scope.rd;
		var showMsg = warn.bind(this, 'Saved', $scope.result.entry.name, 'info');
		var errMsg = warn.bind(this, 'Error', $scope.result.entry.name + ' could not be saved');
		FileSystem.saveAs(rd.title, EXTENSION, angular.toJson(rd, true))
			.then(rememberEntry, errMsg)
			.then(showMsg);
	};

	/// Section methods ///
	$scope.insertSection = function(sectionIndex) {
		var section = createFeature('Untitled Section');
		$scope.rd.sections.splice(sectionIndex, 0, section);
		Scroll.to(section.guid);
	};

	$scope.deleteSection = function(index) {
		$scope.$apply(function() {
			$scope.rd.sections.splice(index, 1);
		});
	};

	/// Feature methods ///
	$scope.deleteFeature = function(section, feature) {
		eachItem(section, 'features', function(f, i, a) {
			if (f.guid !== feature.guid) {
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
			console.trace('Invalid features collection', arguments);
			return warn('Error adding feature', 'The \'features\' collection was empty. You may have an invalid file.');
		}
		var feature = createFeature();
		featureIndex = featureIndex || features.length + 1;
		features.splice(featureIndex, 0, feature);

		Scroll.to(feature.guid);
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
			return tag !== t;
		});
	};

	/// Flag methods ///
	$scope.insertFlag = function(flags, type) {
		if (!flags) {
			return warn('Error adding flag', 'The \'flags\' colleciton was empty.');
		}
		var flag = createFlag(type);
		flags.push(flag);
		Scroll.to(flag.guid);
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
			console.error('Invalid moved item id', guid);
			return;
		}

		// Get the containing object where the item was dropped
		var parent = findItem(parentGuid || $scope.rd.guid);
		if (!parent) {
			console.error('Could not find drop parent in rd', parentGuid);
			return;
		}
		var targetType = parent.item.guid === $scope.rd.guid ? 'sections' : 'features';

		var swap = function() {
			// Out with the old
			moved.parent.item[moved.parent.type].splice(moved.index, 1);

			// In with the new
			parent.item[targetType].splice(newIndex, 0, moved.item);
		};

		$scope.$apply(swap);
	};

	$scope.moveFlag = function(flags, parentGuid, guid, newIndex) {
		var currentIndex = -1;
		var flag = null;
		for (var i=0; i<flags.length; i++) {
			if (flags[i].guid === guid) {
				flag = flags[i];
				currentIndex = i;
				break;
			}
		}
		if (currentIndex < 0) {
			console.error('Invalid flag guid', guid);
			return;
		}
		$scope.$apply(function() {
			flags.splice(currentIndex, 1);
			flags.splice(newIndex, 0, flag);
		});
	};

	$scope.sortStart = function() {
		$scope.$apply(function() {
			$scope.sorting = true;
		});
	};

	$scope.sortStop = function() {
		$scope.$apply(function() {
			$scope.sorting = false;
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
		if (!$scope.rd.files) {return;}
		delete $scope.rd.files[id];
	};

	$scope.formatDate = function(d) {
		return $filter('date')(d, 'yyyy-MM-dd');
	};

	$scope.getRevision = function() {
		var revs = $scope.rd && $scope.rd.revisions;
		if (!revs) {
			return 0.0;
		}
		return revs[revs.length - 1].revision;
	};

	$scope.exampleRevision = function() {
		var version = 1, revision = 0.1;
		if ($scope.rd && $scope.rd.revisions) {
			version = $scope.rd.revisions.length + 1;
			revision = version / 10;
		}
		return {
			'id': Random.id(),
			'version': version,
			'revision': revision,
			'date': $scope.formatDate(new Date()),
			'notes': '',
			'author': ''
		};
	};

	$scope.addRevision = function() {
		if (!$scope.rd.revisions) {
			$scope.rd.revisions = [];
		}
		$scope.rd.revisions.push($scope.exampleRevision());
	};

	$scope.removeRevision = function(i) {
		if (!$scope.rd.revisions) {return;}
		$scope.rd.revisions.splice(i, 1);
	};
}]);
