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

	var handlers = {
		'say': function(o) {
			console.info("Passing through message", o);
			o.action = 'said';
			socket.broadcast(o);
		},
		'said': function(o) {
			console.info("Something was said", o);
			$scope.messages.push(o);
		}
	};

	$scope.socket = socket;

	socket.on('error', function(e) {
		// @todo: handle error display
	});

	socket.on('received', function(info) {
		console.info('Received message', info);
		var data = angular.fromJson(info.message);
		var handler = handlers[data.action];
		if (handler) {
			handler(data);
		}
		else {
			console.info("No handler for action", data);
		}
	});

	$scope.host = function() {
		socket.startHosting()
		.then(function() {
			socket.getHostInfo()
			.then(function(info) {
				console.info("You're a nice host.");
				socket.role = 'host';
				socket.hostInfo = info;

				socket.connectToHost(info)
				.then(function() {
					console.info("You're connected to yourself.");
				});
			});
		});
	};

	$scope.say = function() {
		var message = {
			action: 'say',
			message: socket.message
		};
		socket.message = '';
		socket.send(message);
	};

	$scope.leave = function() {
		socket.disconnectFromHost()
		.then(function() {
			socket.role = null;
			socket.hostInfo = {};
		});
	};

	$scope.stop = function() {
		socket.stopHosting()
		.then(function() {
			socket.role = null;
			socket.hostInfo = {};
		});
	}

}])
