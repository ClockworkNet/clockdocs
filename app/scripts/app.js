angular.module('Clockdoc.Utils', []);
angular.module('Clockdoc.Directives', ['Clockdoc.Utils']);
angular.module('Clockdoc.Filters', ['Clockdoc.Utils']);
angular.module('Clockdoc.Controllers', ['Clockdoc.Utils']);
angular.module('ClockdocApp', [
	'textAngular', 
	'Clockdoc.Utils', 
	'Clockdoc.Directives', 
	'Clockdoc.Filters', 
	'Clockdoc.Controllers'
]);
