angular.module('Clockdoc.Net')
.factory('Socket', ['$q', 'Progress', 'Convert',
function($q, Progress, Convert) {
	var tcpServer = chrome.sockets.tcpServer;
	var tcp = chrome.sockets.tcp;
	var net = chrome.system.network;

	return function Socket(name, persistent) {
		this.name = name;
		this.persistent = !!persistent;
		this.address = "127.0.0.1";
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
			'sending':      [],
			'sent':         [],
			'broadcasting': [],
			'broadcasted':  []
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

			var created = function(info) {
				this.clientSocketId = info.socketId;
				this.fire('connecting', socketInfo);
				tcp.connect(
					socketInfo.socketId, 
					socketInfo.localAddress, 
					socketInfo.localPort, 
					connected.bind(this));
			};

			var connected = function(result) {
				if (result < 0) {
					this.fire('error', result);
					deferred.reject(result);
				}
				else {
					this.fire('connected', result);
					this.serverSocketId = socketInfo.serverSocketId;
					deferred.resolve(this);
				}
			};

			var settings = {
				name: this.name,
				persistent: this.persistent
			};

			var create = function() {
				tcp.create(settings, created.bind(this));
			};

			this.init().then(create.bind(this));

			return deferred.promise;
		};

		this.disconnectFromHost = function() {
			var deferred = $q.defer();
			var disconnected = function() {
				this.serverSocketId = null;
				this.clientSocketId = null;
				this.fire('disconnected', this);
				deferred.resolve();
			};
			tcp.disconnect(this.clientSocketId, disconnected.bind(this));
			return deferred.promise;
		};

		this.killConnection = function(socketId) {
			var deferred = $q.defer();
			tcpServer.disconnect(socketId, deferred.resolve);
			return deferred.promise;
		};

		this.startHosting = function() {
			var deferred = $q.defer();

			var listening = function(result) {
				if (result < 0) {
					this.fire('error', result);
					deferred.reject(result);
				}
				else {
					this.fire('hosting', this);
					deferred.resolve(this);
				}
			};

			var started = function(info) {
				console.info("Started hosting", info);
				this.serverSocketId = info.socketId;
				console.info("Listening on port", this);
				tcpServer.listen(this.serverSocketId, this.address, this.port, listening.bind(this));
			};

			var settings = {
				name: this.name,
				persistent: this.persistent
			};

			var create = function() {
				tcpServer.create(settings, started.bind(this));
			};

			this.init().then(create.bind(this));

			return deferred.promise;
		};

		this.getSocketInfo = function(socketId, method) {
			var deferred = $q.defer();
			socketId = socketId || this.clientSocketId;
			if (!socketId) {
				deferred.reject();
				return deferred.promise;
			}

			var method = method || tcp.getInfo;

			method(socketId, function(info) {
				info.connectionString = info.localAddress + ':' + info.localPort + '@' + info.socketId;
				deferred.resolve(info);
			});
			return deferred.promise;
		};

		this.getHostInfo = function() {
			return this.getSocketInfo(this.serverSocketId, tcpServer.getInfo);
		};

		this.stopHosting = function() {
			var deferred = $q.defer();
			var closed = function() {
				this.initialized = false;
				this.fire('stopped', this);
				deferred.resolve(this);
			}
			tcpServer.close(this.serverSocketId, closed.bind(this));
			return deferred.promise;
		};

		this.getClients = function() {
			var deferred = $q.defer();
			tcpServer.getSockets(deferred.resolve);
			return deferred.promise;
		};

		// Sends a message to all connected sockets
		this.broadcast = function(msg, exceptSocketId) {
			var deferred = $q.defer();
			var done = function(progress) {
				this.fire('broadcasted', progress);
				deferred.resolve(progress);
			};
			var sendToSockets = function(socketIds) {
				this.fire('broadcasting', socketIds);
				var progress = new Progress(socketIds.length, done.bind(this));
				for (var i=0, socketId; socketId=socketIds[i]; i++) {
					this.send(msg, socketId)
					.then(progress.update, progress.fail);
				}
			};
			var gotSockets = function(sockets) {
				var socketIds = sockets.reduce(function(pv, cv, index, a) {
					if (cv.socketId != exceptSocketId) {
						pv.push(cv.socketId);
					}
					return pv;
				}, []);
				sendToSockets.call(this, socketIds);
			};
			tcpServer.getSockets(gotSockets.bind(this));
			return deferred.promise;
		};

		// Sends a message to one connected socket
		// or the server if a socket isn't specified
		this.send = function(msg, socketId) {
			var deferred = $q.defer();

			if (!socketId && this.clientSocketId) {
				// If no socket is specified, send to the connected server.
				socketId = this.serverSocketId;
			}

			var json = typeof(msg) == 'string' ? msg : angular.toJson(msg);
			var buffer = Convert.stringToArrayBuffer(json);

			var info = {
				data: buffer,
				socketId: socketId
			};
			this.fire('sending', info);

			if (!socketId) {
				// If we still don't have a target socket, assume this is a local message
				this.fire('sent', info);
				this.onReceived(info);
				deferred.resolve(info);
			}
			else {
				// Otherwise, actually send this on the wire
				var sent = function(result) {
					if (result < 0) {
						this.fire('error', result);
						deferred.reject(result);
					}
					else {
						this.fire('sent', msg);
						deferred.resolve(msg);
					}
				};
				tcp.send(socketId, buffer, sent.bind(this));
			}

			return deferred.promise;
		};

		this.init = function() {
			var deferred = $q.defer();

			this.serverSocketId = null;
			this.clientSocketId = null;

			if (this.initialized) {
				deferred.resolve();
				return deferred.promise;
			}

			this.fire('initializing', this);

			var fireError = function(msg) {
				return (function(data) {
					data.message = msg;
					this.fire('error', data);
				}).bind(this);
			};

			tcp.onReceive.addListener(this.onReceived.bind(this));
			tcpServer.onAccept.addListener(this.onAccepted.bind(this));

			tcp.onReceiveError.addListener(fireError("Receive error"));
			tcpServer.onAcceptError.addListener(fireError("Accept error"));

			// Look for a better IP address than "localhost"
			var setNet = function(nets) {
				for (var i=0, net; net=nets[i]; i++) {
					if (net.prefixLength == 24) {
						this.address = net.address;
						break;
					}
				}
				this.initialized = true;
				deferred.resolve(this);
			};
			net.getNetworkInterfaces(setNet.bind(this));

			return deferred.promise;
		};

		this.onReceived = function(info) {
			info.message = Convert.arrayBufferToString(info.data);
			this.fire('received', info);
		};

		this.onAccepted = function(data) {
			if (data.socketId != this.serverSocketId) {
				console.info("Message to wrong server received", data, this);
				return;
			}
			this.fire('connection', data);
			tcp.setPaused(data.clientSocketId, false);
		};
	}
}
]);
