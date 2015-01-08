/*global $:false, angular:false */
'use strict';

angular.module('Clockdoc.Controllers')
.controller('RdCtrl', ['$scope', '$timeout', '$http', 'Doc', 'Random', 'Scroll', 'Stylesheet', 'Monitor', 'Platform', 'RecentFiles', 'Preferences', function($scope, $timeout, $http, Doc, Random, Scroll, Stylesheet, Monitor, Platform, RecentFiles, Preferences) {

	// Load platform information
	Platform.load($scope, 'platform');
	var ALERT_TIME = 5000;

	/* The in-memory file being manipulated */
	$scope.doc = null;

	/* Tracks the feature or section element currently in view */
	$scope.activeItem = null;
	$scope.activeGuids = {};
	$scope.activeTree = [];
	$scope.preferences = Preferences;

	/* A reference to the file current and most recent sources (filesystem and/or svn) */
	$scope.files = {
		current: {},
		recent: []
	};

	/* Tracks whether the rd has changed */
	$scope.docRootChanged = false;

	$scope.flagTypes = Doc.flagTypes;
	$scope.availableTags = Doc.availableTags;

	$scope.addFileStyle = function(file) {
		Stylesheet.addRule(
			'.' + file.id,
			'background-image: url(' + file.data + ')'
		);
	};

	$scope.loadDoc = function(root) {
		for (var id in root.files) {
			if (!root.files.hasOwnProperty(id)) {continue;}
			$scope.addFileStyle(root.files[id]);
		}

		if (!$scope.doc) {
			$scope.doc = new Doc(root);
		}
		else {
			$scope.doc.root = root;
		}
	};

	$scope.getSampleDoc = function(type) {
		if (type === 'rd') {
			var doc = new Doc();
			return doc.root;
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

	$scope.setActiveItem = function(item) {
		$scope.$apply(function() {
			$scope.activeItem = item;
			$scope.activeGuids = {};
			$scope.activeTree = [];

			var node = $scope.doc.findNode(item.guid);
			while (node && node.parent) {
				$scope.activeGuids[node.item.guid] = true;
				$scope.activeTree.push(node);
				node = node.parent;
			}
			$scope.activeTree.reverse();
		});
	};

	$scope.setWorking = function(value) {
		if (!value) {
			// Wait until we're truly not working
			var wait = function() {
				if ($http.pendingRequests.length > 0) {
					return $timeout(wait);
				}
				$scope.working = false;
			};
			$timeout(wait);
		}
		else {
			$scope.working = true;
		}
	};

	$scope.watchForChange = function() {
		$scope.docRootChanged = false;

		if ($scope.changeMonitor) {
			$scope.changeMonitor.stop();
		}

		$scope.changeMonitor = new Monitor($scope, 'doc', 1000);
		$scope.changeMonitor.start()
		.then(function() {
			$scope.docRootChanged = true;
		});
	};

	$scope.clearFile = function(file) {
		$scope.files.current = {};
		$scope.working = false;
		$scope.forgetFile(file);
		$scope.watchForChange();
	};

	$scope.setFile = function(file) {
		$scope.files.current = file;
		$scope.working = false;
		$scope.rememberFile(file);
		$scope.watchForChange();
	};

	$scope.setRecentFiles = function(files) {
		$scope.files.recent = files;
	};

	$scope.forgetFile = function(file) {
		RecentFiles.forget(file)
		.then($scope.setRecentFiles.bind(this));
	};

	$scope.rememberFile = function(file) {
		if (!file) {
			return;
		}
		RecentFiles.remember(file, $scope.doc && $scope.doc.root && $scope.doc.root.title)
		.then($scope.setRecentFiles.bind(this));
	};

	RecentFiles.load().then($scope.setRecentFiles.bind(this));

	$scope.setSvnInstalled = function(value) {
		$scope.svnInstalled = value;
	};

	$scope.speedBump = function(nextAction) {
		$scope.nextAction = nextAction;
		$scope.docRootChanged = true;
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

	$scope.scrollTo = function(id) {
		Scroll.to(id);
	};

	/// Section methods ///
	$scope.insertSection = function(sectionIndex) {
		var section = $scope.doc.insertSection(sectionIndex);
		$scope.scrollTo(section.guid);
	};

	$scope.deleteSection = function(index) {
		$scope.$apply(function() {
			$scope.doc.deleteSection(index);
		});
	};

	/// Feature methods ///
	$scope.getFeatureId = function(feature) {
		var node = $scope.doc.findNode(feature.guid);
		if (!node) {return '';}
		return node.id();
	};

	$scope.deleteFeature = function(section, feature) {
		$scope.$apply(function() {
			$scope.doc.deleteFeature(section, feature);
		});
	};

	$scope.insertFeature = function(features, featureIndex) {
		var feature = $scope.doc.insertFeature(features, featureIndex);
		$scope.scrollTo(feature.guid);
	};

	/// Tag methods ///
	$scope.tagAbbrs = function(feature) {
		var abbrify = function(s) {
			return s.replace(/[^a-zA-Z0-9]/gi, '-').toLowerCase();
		};
		return feature.tags.map(abbrify).join(' ');
	};

	$scope.featureHasTag = function(feature, tag) {
		return $scope.doc.featureHasTag(feature, tag);
	};

	$scope.toggleTag = function(feature, tag) {
		$scope.doc.toggleTag(feature, tag);
	};

	$scope.addTag = function(feature, tag) {
		$scope.doc.addTag(feature, tag);
	};

	$scope.removeTag = function(feature, tag) {
		$scope.doc.removeTag(feature, tag);
	};

	/// Flag methods ///
	$scope.insertFlag = function(flags, type) {
		var flag = $scope.doc.insertFlag(flags, type);
		$scope.scrollTo(flag.guid);
	};

	$scope.deleteFlag = function(flags, index) {
		$scope.$apply(function() {
			$scope.doc.deleteFlag(flags, index);
		});
	};

	$scope.moveItem = function(parentGuid, guid, newIndex) {
		$scope.doc.moveItem(parentGuid, guid, newIndex);
	};

	$scope.moveFlag = function(flags, parentGuid, guid, newIndex) {
		$scope.doc.moveFlag(flags, parentGuid, guid, newIndex);
	};

	$scope.addFile = function(file) {
		$scope.addFile(file);
		$scope.addFileStyle(file);
	};

	$scope.removeFile = function(id) {
		$scope.doc.removeFile(id);
	};

	$scope.formatDate = function(d) {
		return $scope.doc.formatDate(d);
	};

	$scope.getRevision = function() {
		return $scope.doc.getRevision();
	};

	$scope.exampleRevision = function() {
		return $scope.doc.exampleRevision();
	};

	$scope.addRevision = function() {
		$scope.doc.addRevision();
	};

	$scope.removeRevision = function(i) {
		$scope.doc.removeRevision(i);
	};

	$scope.setReadonly = function(value) {
		$scope.readonly = value;
	};
}]);
