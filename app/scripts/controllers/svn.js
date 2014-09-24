/*global angular:false */
'use strict';

angular.module('Clockdoc.Controllers')
.controller('SvnCtrl', ['$scope', 'Svn', 'Platform', function($scope, Svn, Platform) {

	Platform.load($scope, 'platform');

	/// SVN ///
	$scope.svn = {
		url: Svn.svnRoot
	};

	Svn.test().then(function(res) {
		console.info(res);
		$scope.setSvnInstalled(true);
	}, function(res) {
		console.info(res);
		$scope.setSvnInstalled(false);
	});

	function svnError(e) {
		console.error('SVN error', e);
		$scope.warn('A SVN error occurred.', 'Check the console log for details.');
		$scope.setWorking(false);
	}

	function svnRead(result) {
		console.info('Read from SVN', result);

		$scope.setWorking(false);
		$scope.setResult(result);
		Svn.info(result.svnLocation.full)
			.then(function(info) {
				$scope.svn = info;
			});
		try {
			$scope.loadDoc(angular.fromJson(result.content));
			$scope.unwarn();
		}
		catch (e) {
			console.error('Error reading file', e, result);
			$scope.warn('File error', 'There was an error reading the SVN file. Check the console log for details');
		}
	}

	function svnCommitted(result) {
		$scope.setWorking(false);
		$scope.setResult(result);
		$scope.warn('Committed', 'changes committed to SVN', 'success');
	}

	$scope.openSvn = function() {
		$scope.setWorking(true);
		Svn.open($scope.svn.url)
			.then(svnRead, svnError);
	};

	$scope.checkout = function() {
		$scope.setWorking(true);
		Svn.checkout($scope.svn.url)
			.then(svnRead, svnError);
	};

	$scope.installSvn = function() {
		$scope.setWorking(true);
		Svn.install().then(function() {
			$scope.setWorking(false);
			$scope.svnInstalled = true;
		}, function() {
			// installation was cancelled
			$scope.setWorking(false);
		});
	};

	$scope.commit = function() {
		$scope.setWorking(true);
		$scope.result.content = angular.toJson($scope.rd, true);
		Svn.commit($scope.result, $scope.svn.message)
			.then(svnCommitted, svnError);
	};
}]);
