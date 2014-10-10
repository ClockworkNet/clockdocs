/*global angular:false */
'use strict';

angular.module('Clockdoc.Utils', []);
angular.module('Clockdoc.Directives', ['Clockdoc.Utils']);
angular.module('Clockdoc.Filters', ['Clockdoc.Utils']);
angular.module('Clockdoc.Models', ['Clockdoc.Utils']);
angular.module('Clockdoc.Controllers', ['Clockdoc.Utils', 'Clockdoc.Models']);
angular.module('ClockdocApp', [
	'textAngular',
	'Clockdoc.Utils',
	'Clockdoc.Directives',
	'Clockdoc.Filters',
	'Clockdoc.Models',
	'Clockdoc.Controllers'
]);
