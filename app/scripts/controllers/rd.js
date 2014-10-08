/*global $:false, angular:false */
'use strict';

angular.module('Clockdoc.Controllers')
.controller('RdCtrl', ['$scope', '$filter', '$timeout', 'Random', 'Scroll', 'Stylesheet', 'Monitor', 'Platform', 'LocalStorage', function($scope, $filter, $timeout, Random, Scroll, Stylesheet, Monitor, Platform, LocalStorage) {

	// Load platform information
	Platform.load($scope, 'platform');

	var RECENT_ENTRIES = 'recent_entries';
	var RECENT_ENTRIES_MAX = 10;
	var ALERT_TIME = 5000;

	$scope.rd = null;
	$scope.sorting = false;
	$scope.rdChanged = false;

	var flagTypes = $scope.flagTypes = [
		{
			type: 'definition',
			name: 'Definition',
			title: ''
		},
		{
			type: 'dev_note',
			name: 'Dev Note',
			title: 'Dev Note'
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

	$scope.addFileStyle = function(result) {
		Stylesheet.addRule(
			'.' + result.id,
			'background-image: url(' + result.data + ')'
		);
	};

	$scope.loadDoc = function(doc) {
		for (var id in doc.files) {
			if (!doc.files.hasOwnProperty(id)) {continue;}
			$scope.addFileStyle(doc.files[id]);
		}
		$scope.setRd(doc);
	};

	$scope.getSampleDoc = function(type) {
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
	};

	$scope.setWorking = function(value) {
		$scope.working = value;
	};

	$scope.watchForChange = function() {
		$scope.rdChanged = false;

		if ($scope.changeMonitor) {
			$scope.changeMonitor.stop();
		}

		$scope.changeMonitor = new Monitor($scope, 'rd', 1000);
		$scope.changeMonitor.start()
		.then(function() {
			$scope.rdChanged = true;
		});
	};

	$scope.setRd = function(rd) {
		$scope.rd = rd;
	};

	$scope.setResult = function(result) {
		$scope.result = result;
		$scope.working = false;
		if (result && result.entryId) {
			$scope.rememberResult(result);
		}
		$scope.watchForChange();
	};

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
	LocalStorage.get(RECENT_ENTRIES)
	.then(function(results) {
		$scope.recentEntries = unique(results, 'entryId');
	});

	/**
	 *¬Forgets the specified entry and shows an error message
	**/
	$scope.forgetResult = function(entryId, e) {
		$scope.recentEntries = $scope.recentEntries.filter(function(r) {
			return r.entryId !== entryId;
		});
		$scope.setWorking(false);
		$scope.setResult(null);
		LocalStorage.set(RECENT_ENTRIES, $scope.recentEntries);

		if (e) {
			console.error('file error', e);
			$scope.warn('Error', e.message);
		}
	};

	/**
	 * Remembers a recent entry into LocalStorage¬
	**/
	$scope.rememberResult = function(result) {
		if (!result || !result.entryId) {
			return;
		}

		var entries = $scope.recentEntries;

		if (!entries) {
			entries = [];
		}

		var newEntry = {
			entryId: result.entryId,
			name: result.entry.name,
			title: $scope.rd && $scope.rd.title,
			result: result,
			date: new Date()
		};

		result.getDisplayPath()
		.then(function(path) {
			newEntry.path = path;

			// Add the entry to the top
			entries.splice(0, 0, newEntry);

			// Trim the array of entries
			entries = unique(entries, 'path').slice(0, RECENT_ENTRIES_MAX);

			LocalStorage.set(RECENT_ENTRIES, entries)
			.then(function() {
				$scope.recentEntries = entries;
			});
		});
	};

	$scope.setSvnInstalled = function(value) {
		$scope.svnInstalled = value;
	};

	$scope.speedBump = function(nextAction) {
		$scope.nextAction = nextAction;
		$scope.rdChanged = true;
		$('#speedBump').modal();
		return false;
	};

	$scope.unwarn = function() {
		$scope.alert = {};
	};

	$scope.warn = function(title, msg, type) {
		type = type || 'danger';
		$scope.alert = {
			type: type,
			title: title,
			content: msg
		};
		$('.alert').alert();
		$timeout($scope.unwarn, ALERT_TIME);
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
			return;
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
			return;
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

	$scope.addFile = function(result) {
		if (!$scope.rd.files) {
			$scope.rd.files = {};
		}
		result.id = Random.id();
		$scope.rd.files[result.id] = result;
		$scope.addFileStyle(result);
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

	$scope.setReadonly = function(value) {
		$scope.readonly = value;
	};
}]);
