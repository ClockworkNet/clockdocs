/*global angular:false */
'use strict';

angular.module('Clockdoc.Controllers')
.controller('PreferencesCtrl', ['$scope', 'Preferences', function($scope, Preferences) {
	$scope.preferences = Preferences;

	$scope.save = function() {
		$scope.preferences.save();
		$scope.warn('Preferences saved!', '', 'success');
	};
}]);
