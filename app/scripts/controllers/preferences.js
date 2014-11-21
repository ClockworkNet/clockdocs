/*global angular:false */
'use strict';

angular.module('Clockdoc.Controllers')
.controller('PreferencesCtrl', ['$scope', 'Preferences', function($scope, Preferences) {
	$scope.preferences = Preferences;

	$scope.$watch('preferences', function() {
		$scope.preferences.save();
	});
}]);
