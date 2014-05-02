angular.module('Clockdoc.Controllers')

.controller('SocketInfoCtrl', ['$scope', 'socket', 
function($scope, socket) {
	$scope.socket = socket;

	$scope.join = function() {
		socket.connectToHost(socket.hostInfo.connectionString)
		.then(function(s) {
			socket.role = 'client';
		});
	};
}])

.controller('SocketMenuCtrl', ['$scope', 'socket', 
function($scope, socket) {

	$scope.socket = socket;

	socket.on('error', function(e) {

	});

	socket.on('received', function(str) {
		$scope.$apply(function() {
			var msg = angular.fromJson(str);
			$scope.socket.messages.push(msg);
		});
	});

	$scope.host = function() {
		socket.startHosting()
		.then(function(s) {
			socket.getHostInfo()
			.then(function(info) {
				$scope.socket.role = 'host';
				$scope.socket.hostInfo = info;
			});
		});
	};

	$scope.say = function() {
		switch ($scope.role) {
			case 'host':
				socket.broadcast($scope.message);
				$scope.message = '';
				break;
			case 'client':
				socket.send($scope.message);
				$scope.message = '';
				break;
			default:
				break;
		}
	};

	$scope.leave = function() {
		socket.disconnectFromHost()
		.then(function() {
			$scope.socket.role = null;
			$scope.socket.hostInfo = {};
		});
	};

	$scope.stop = function() {
		socket.stopHosting()
		.then(function() {
			$scope.socket.role = null;
			$scope.socket.hostInfo = {};
		});
	}

}])
