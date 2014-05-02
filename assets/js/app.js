angular.module('Clockdoc.Utils', []);
angular.module('Clockdoc.Net', ['Clockdoc.Utils']);
angular.module('Clockdoc.Directives', ['Clockdoc.Utils']);
angular.module('Clockdoc.Filters', ['Clockdoc.Utils']);
angular.module('Clockdoc.Controllers', ['Clockdoc.Utils', 'Clockdoc.Net']);

angular.module('ClockdocApp', [
	'textAngular', 
	'Clockdoc.Directives', 
	'Clockdoc.Filters', 
	'Clockdoc.Controllers'
])

// This socket is shared across multiple controllers
.factory('socket', ['Socket', function(Socket) {
	return new Socket('Clockdoc');
}])
