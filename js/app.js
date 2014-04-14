angular.module('Clockdoc.Utils', []);
angular.module('Clockdoc.Directives', []);
angular.module('Clockdoc.Controllers', ['Clockdoc.Utils']);
angular.module('ClockdocApp', ['Clockdoc.Utils', 'Clockdoc.Directives', 'Clockdoc.Controllers']);
