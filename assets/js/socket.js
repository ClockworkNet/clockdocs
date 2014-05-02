angular.module('Clockdoc.Net')
.factory('Socket', ['$q', 'Progress', 'Convert',
function($q, Progress, Convert) {
	var tcpServer = chrome.sockets.tcpServer;
	var tcp = chrome.sockets.tcp;
	var net = chrome.system.network;

	return function Socket(name, persistent) {
		this.name = name;
		this.persistent = !!persistent;
		this.address = "localhost";
		this.port = 8080;

		this.listeners = {
			'initializing': [],
			'error':        [],
			'hosting':      [],
			'stopped':      [],
			'connecting':   [],
			'connected':    [],
			'disconnected': [],
			'connection':   [],
			'received':     [],
			'sent':         []
		};

		this.on = function(event, callback) {
			this.listeners[event].push(callback);
		};

		this.fire = function(event, data) {
			console.trace(event, data);
			this.listeners[event].forEach(function(callback) {
				callback(data);
			});
		};

		this.initialized = false;

		this.serverSocketId = null;
		this.clientSocketId = null;

		this.active = function() {
			return this.clientSocketId || this.serverSocketId;
		};

		this.parseConnectionString = function(str) {
			var info = {};
			var match = str.match(/^([^:]+):([^@]+)@(.+)$/);
			if (!match) {
				return info;
			}
			info.connectionString = str;
			info.localAddress = match[1];
			info.localPort = match[2];
			info.socketId = match[3];
			return info;
		};

		this.connectToHost = function(socketInfo) {

			if (typeof(socketInfo) == 'string') {
				socketInfo = this.parseConnectionString(socketInfo);
			}

			var deferred = $q.defer();
			var self = this;

			var created = function(info) {
				self.clientSocketId = info.socketId;
				self.fire('connecting', socketInfo);
				tcp.connect(socketInfo.socketId, socketInfo.localAddress, socketInfo.localPort, connected);
			};

			var connected = function(result) {
				if (result < 1) {
					self.fire('error', result);
					deferred.reject(result);
				}
				else {
					self.serverSocketId = serverSocketId;
					self.fire('connected', result);
					deferred.resolve(self);
				}
			};

			this.init()
			.then(function() {
				tcp.create({name: this.name, persistent: this.persistent}, created);
			});

			return deferred.promise;
		};

		this.disconnectFromHost = function() {
			var deferred = $q.defer();
			var self = this;
			tcp.disconnect(this.clientSocketId, function() {
				self.serverSocketId = null;
				self.clientSocketId = null;
				self.fire('disconnected', self);
				deferred.resolve();
			});
			return deferred.promise;
		};

		this.killConnection = function(socketId) {
			var deferred = $q.defer();
			tcpServer.disconnect(socketId, deferred.resolve);
			return deferred.promise;
		};

		this.startHosting = function() {
			var deferred = $q.defer();
			var self = this;

			var started = function(info) {
				self.serverSocketId = info.socketId;
				listen();
			};

			var listen = function() {
				tcpServer.listen(self.serverSocketId, self.address, self.port, function(result) {
					if (result < 0) {
						self.fire('error', result);
						deferred.reject(result);
					}
					else {
						self.fire('hosting', self);
						deferred.resolve();
					}
				});
			};

			this.init()
			.then(function() {
				tcpServer.create({
					name: this.name,
					persistent: this.persistent
				}, started);
			});

			return deferred.promise;
		};

		this.getHostInfo = function() {
			var deferred = $q.defer();
			if (!this.serverSocketId) {
				deferred.reject();
			}
			else {
				tcpServer.getInfo(this.serverSocketId, function(info) {
					info.connectionString = info.localAddress + ':' + info.localPort + '@' + info.socketId;
					deferred.resolve(info);
				});
			}
			return deferred.promise;
		};

		this.stopHosting = function() {
			var deferred = $q.defer();
			var self = this;
			tcpServer.close(this.serverSocketId, function() {
				self.serverSocketId = null;
				self.clientSocketId = null;
				self.fire('stopped', self);
				deferred.resolve();
			});
			return deferred.promise;
		};

		// Sends a message to all connected sockets
		this.broadcast = function(msg, exceptSocketId) {
			var deferred = $q.defer();
			var self = this;
			var sendToSockets = function(socketIds) {
				var progress = new Progress(socketIds.length, deferred.resolve);
				for (var i=0, socketId; socketId=socketIds[i]; i++) {
					self.send(msg, socketId)
					.then(progress.update, progress.fail);
				}
			};
			tcpServer.getSockets(function(sockets) {
				var socketIds = sockets.reduce(function(pv, cv, index, a) {
					if (cv.socketId != exceptSocketId) {
						pv.push(cv.socketId);
					}
					return pv;
				}, []);
				sendToSockets(socketIds);
			});
			return deferred.promise;
		};

		// Sends a message to one connected socket
		// or the server if a socket isn't specified
		this.send = function(msg, socketId) {
			var deferred = $q.defer();

			// If no socket is specified, send to the connected server.
			socketId = socketId || this.serverSocketId;

			var buffer = Convert.stringToArrayBuffer(msg);
			var self = this;

			tcp.send(socketId, buffer, function(data) {
				if (data.resultCode < 0) {
					self.fire('error', data);
					deferred.reject(data);
				}
				else {
					self.fire('sent', data);
					deferred.resolve(data);
				}
			});
			return deferred.promise;
		};

		this.init = function() {
			var deferred = $q.defer();

			if (this.initialized) {
				deferred.resolve();
				return deferred.promise;
			}

			var self = this;
			self.fire('initializing', self);

			var fireError = function(msg) {
				return function(data) {
					var e = new Error(msg);
					e.data = data;
					self.fire('error', e);
				};
			};

			tcp.onReceive.addListener(this.onReceived);
			tcpServer.onAccept.addListener(this.onAccepted);

			tcp.onReceiveError.addListener(fireError("Receive error"));
			tcpServer.onAcceptError.addListener(fireError("Accpet error"));

			// Look for a better IP address than "localhost"
			net.getNetworkInterfaces(function(nets) {
				for (var i=0, net; net=nets[i]; i++) {
					if (net.prefixLength == 24) {
						self.address = net.address;
						break;
					}
				}
				self.initialized = true;
				deferred.resolve();
			});

			return deferred.promise;
		};

		this.onReceived = function(info) {
			info.message = Convert.arrayBufferToString(info.data);
			self.fire('received', info);
		};

		this.onAccepted = function(data) {
			if (data.socketId != this.serverSocketId) {
				return;
			}
			tcp.setPaused(data.clientSocketId, false);
			this.fire('connection', data);
		};
	}
}
]);
