/*global $:false, angular:false */
'use strict';

angular.module('Clockdoc.Controllers')
.controller('NavCtrl', ['$scope', '$timeout', '$q', '$window', 'FileSystem', 'File', 'Templates', function($scope, $timeout, $$q, $window, FileSystem, File, Templates) {

	var EXTENSION = 'cw';

	// Look for a file to open from the launch
	$($window).on('load', function() {
		if (!this.launchData || !this.launchData.entry) {
			return;
		}
		var entry = this.launchData.entry;
		var id = FileSystem.retain(entry);
		var file = new File(entry, id);
		readFile(file);
	});

	/*
	 * Reads the FileSystemEntry file contents and sets it on the app
	 */
	function readFile(file) {
		FileSystem.read(file)
		.then(function(file) {
			$scope.setWorking(false);
			if (!file || !file.content) {
				return;
			}
			try {
				var doc = angular.fromJson(file.content);
				$scope.loadDoc(doc);
				$scope.setFile(file);
			}
			catch (e) {
				console.error('file open error', e);
				$scope.warn('Error', 'There is a problem with your file.');
			}
		})
		.catch($scope.forgetFile.bind(null, file));
	}

	/// Filesystem Methods ///
	$scope.create = function(skipCheck) {
		if (!skipCheck && $scope.rdChanged) {
			return $scope.speedBump($scope.create.bind(this, true));
		}
		var doc = $scope.getSampleDoc('rd');
		$scope.loadDoc(doc);
		$scope.setFile({});
	};

	$scope.open = function(file, skipCheck) {
		if (!skipCheck && $scope.rdChanged) {
			return $scope.speedBump($scope.open.bind(this, file, true));
		}

		var entryId = file && file.entryId;

		var onError = function(e) {
			if (e.message !== FileSystem.MESSAGE_USER_CANCELLED) {
				console.error(e);
				$scope.clearFile(file);
				$scope.warn('Error', 'An error occurred.');
			}
			else {
				$scope.setWorking(false);
			}
		};

		var addLocations = function(restoredFile) {
			restoredFile.remote = file.remote;
			restoredFile.local = file.local;
			return restoredFile;
		};

		$scope.setWorking(true);

		if (entryId) {
			FileSystem.restore(entryId)
			.then(addLocations, onError)
			.then(readFile, onError);
		}
		else {
			FileSystem.openFile([EXTENSION, 'json'])
			.then(readFile, onError);
		}
	};

	$scope.title = function() {
		if ($scope.rd && $scope.rd.title) {
			return $scope.rd.title;
		}
		var file = $scope.files.current;
		if (file && file.entry && file.entry.name) {
			return file.entry.name;
		}
		return 'Untitled';
	};

	$scope.filename = function() {
		if ($scope.files.current && $scope.files.current.entry) {
			var name = $scope.files.current.entry.name;
			return name.substring(0, name.lastIndexOf('.'));
		}
		return $scope.rd && $scope.rd.title;
	};

	$scope.save = function() {
		if (!$scope.files.current.entryId) {
			$scope.saveAs();
			return;
		}
		var showMsg = $scope.warn.bind(this, 'Saved!', $scope.files.current.entry.name, 'info');
		var errMsg = $scope.warn.bind(this, 'Error!', $scope.files.current.entry.name + ' could not be saved');
		var content = angular.toJson($scope.rd, true);
		FileSystem.save($scope.files.current.entryId, content)
			.then($scope.rememberFile, errMsg)
			.then($scope.watchForChange, errMsg)
			.then(showMsg);
	};

	$scope.saveAs = function() {
		var rd = $scope.rd;
		var name = $scope.filename();
		var showMsg = $scope.warn.bind(this, 'Saved!', name, 'info');
		var errMsg = $scope.warn.bind(this, 'Error!', name + ' could not be saved');
		FileSystem.saveAs(name, EXTENSION, angular.toJson(rd, true))
			.then($scope.setFile, errMsg)
			.then($scope.watchForChange, errMsg)
			.then(showMsg);
	};

	$scope.export = function(format) {
		var name = $scope.filename();
		var extension = Templates.formats[format].extension;
		var path = name + '.' + extension;

		var showMsg = $scope.warn.bind(this, 'Done!', path + ' has been exported', 'info');
		var errMsg = $scope.warn.bind(this, 'Error!', path + ' could not be exported');

		Templates.render(format, $scope.rd)
		.then(function(output) {
			FileSystem.saveAs(name, extension, output)
				.then(showMsg, errMsg);
		});
	};

	$scope.print = function() {
		window.print();
	};
}]);
