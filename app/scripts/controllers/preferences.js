/*global angular:false */
'use strict';

angular.module('Clockdoc.Controllers')
.controller('PreferencesCtrl', ['$scope', 'Preferences', function($scope, Preferences) {
	$scope.endpoint = {};
	$scope.preferences = {};

	angular.copy(Preferences, $scope.preferences);

	function cleanEndpoints() {
		if (!Array.isArray($scope.preferences.endpoints)) {
			$scope.preferences.endpoints = [];
		}
		var seen = {};
		var dupeless = function(ep) {
			if (!ep || !ep.getUrl || seen[ep.getUrl]) {
				return false;
			}
			seen[ep.getUrl] = 1;
			return true;
		};
		$scope.preferences.endpoints = $scope.preferences.endpoints.filter(dupeless);
	}

	$scope.save = function() {
		cleanEndpoints();
		angular.copy($scope.preferences, Preferences);
		Preferences.save();
	};

	$scope.addEndpoint = function() {
		if (!$scope.preferences.endpoints || !$scope.preferences.endpoints.push) {
			$scope.preferences.endpoints = [];
		}
		$scope.preferences.endpoints.push($scope.endpoint);
		$scope.endpoint = {};
	};

	$scope.removeEndpoint = function(index) {
		if (!$scope.preferences.endpoints) {
			return;
		}
		$scope.preferences.endpoints = $scope.preferences.endpoints.slice(index, 1);
	};
}]);
