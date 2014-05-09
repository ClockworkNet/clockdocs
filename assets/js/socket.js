angular.module('Clockdoc.Net')
.factory('Socket', ['$q', 'Progress', 'Convert',
function($q, Progress, Convert) {
	var tcpServer = chrome.sockets.tcpServer;
	var tcp = chrome.sockets.tcp;
	var net = chrome.system.network;
	var runtime = chrome.runtime;

	var Socket = function(name) {
		this.name = name;
		this.persistent = false;
		this.address = "127.0.0.1";
		this.port = 8080;

		this.listeners = {
			'initializing': [],
			'error':        [],
			'hosting':      [],
			'stopped':      [],
			'connecting':   [],
			'connected':    [],
			'closed':       [],
			'connection':   [],
			'received':     [],
			'sending':      [],
			'sent':         [],
			'broadcasting': [],
			'broadcasted':  []
		};

		this.initialized = false;
		this.active = false;
		this.server = {};
		this.client = {};
	}

	Socket.prototype = {

		on: function(event, callback) {
			this.listeners[event].push(callback);
		},

		fire: function(event, data) {
			console.trace(event, data);
			this.listeners[event].forEach(function(callback) {
				callback(data);
			});
		},

		parseConnectionString: function(str) {
			var info = {};
			var match = str.match(/^([^:]+):([^@]+)@(.+)$/);
			if (!match) {
				return info;
			}
			info.connectionString = str;
			info.localAddress = match[1];
			info.localPort = parseInt(match[2]);
			info.socketId = parseInt(match[3]);
			return info;
		},

		createConnectionString: function(info) {
			return info.localAddress + ':' + info.localPort + '@' + info.socketId;
		},

		connectToHost: function(socketInfo) {

			if (typeof(socketInfo) == 'string') {
				socketInfo = this.parseConnectionString(socketInfo);
			}

			var deferred = $q.defer();

			var created = function(info) {
				this.client = info;
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
					this.client.host = socketInfo;
					this.active = true;
					deferred.resolve(socketInfo);
				}
			};

			var settings = {
				name: this.name + 'Client',
				persistent: this.persistent
			};

			var create = function() {
				tcp.create(settings, created.bind(this));
			};

			if (this.client && this.client.socketId) {
				created.call(this, this.client);
			}
			else {
				this.init().then(create.bind(this));
			}

			return deferred.promise;
		},

		disconnect: function(type) {
			var deferred = $q.defer();
			var owner = type == 'server' ? tcpServer : tcp;
			var sock = this[type];
			console.info('disconnecting', type, sock);
			if (!sock || !sock.socketId) {
				deferred.resolve();
			}
			else {
				delete sock.host;
				owner.disconnect(sock.socketId, deferred.resolve);
			}
			return deferred.promise;
		},

		stop: function() {
			var server = this.server;
			var client = this.client;
			this.active = false;

			// close all clients first
			// in this case, we can set and forget
			if (server && server.socketId) {
				tcpServer.getSockets(function(sockets) {
					sockets.forEach(function(socket) {
						tcpServer.close(socket.socketId);
					});
				});
				return this.disconnect('server');
			}
			else {
				// If we're just a client, kill it
				return this.disconnect('client');
			}
		},

		startHosting: function() {
			var deferred = $q.defer();

			var checkError = function(result) {
				if (result < 0) {
					this.fire('error', result);
					deferred.reject(result);
					return true;
				}
				return false;
			};

			var started = function(info) {
				info.localAddress = this.address;
				info.localPort = this.port;
				info.connectionString = this.createConnectionString(info);

				this.server = info;

				var done = function(info) {
					this.fire('hosting', this);
					deferred.resolve(info);
				};

				var listening = function(result) {
					if (checkError(result)) return;
					this.connectToHost(info)
					.then(done.bind(this), deferred.reject);
				};

				tcpServer.listen(
					this.server.socketId, 
					this.address, 
					this.port, 
					listening.bind(this)
				);
			};

			var settings = {
				name: this.name,
				persistent: this.persistent
			};

			var create = function() {
				tcpServer.create(settings, started.bind(this));
			};

			// Reuse the socket!
			if (this.server && this.server.socketId) {
				started.call(this, this.server);
			}
			else {
				this.init().then(create.bind(this));
			}

			return deferred.promise;
		},

		getSocketInfo: function(socketId, method) {
			var deferred = $q.defer();
			socketId = socketId || this.clientSocketId;
			if (!socketId) {
				deferred.reject();
				return deferred.promise;
			}

			var method = method || tcp.getInfo;
			var tocs = this.createConnectionString;

			method(socketId, function(info) {
				info.connectionString = tocs(info);
				deferred.resolve(info);
			});
			return deferred.promise;
		},

		getHostInfo: function() {
			return this.getSocketInfo(this.server.socketId, tcpServer.getInfo);
		},

		getClients: function() {
			var deferred = $q.defer();
			tcpServer.getSockets(deferred.resolve);
			return deferred.promise;
		},

		// Sends a message to all connected sockets
		broadcast: function(msg, exceptSocketId) {
			var deferred = $q.defer();
			var done = function(progress) {
				this.fire('broadcasted', progress);
				deferred.resolve(progress);
			};
			var sendToSockets = function(socketIds) {
				this.fire('broadcasting', socketIds);
				var progress = new Progress(socketIds.length, done.bind(this));
				var updated = function() {
					progress.update();
				};
				var failed = function() {
					progress.fail();
				};
				for (var i=0, socketId; socketId=socketIds[i]; i++) {
					this.send(msg, socketId)
					.then(updated, failed);
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
		},

		// Sends a message to one connected socket
		// or the server if a socket isn't specified
		send: function(msg, socketId) {
			var deferred = $q.defer();

			if (!socketId && this.client && this.client.host && this.client.host.socketId) {
				// If no socket is specified, send to the connected server.
				socketId = this.client.host.socketId;
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
		},

		init: function() {
			var deferred = $q.defer();

			if (this.initialized) {
				deferred.resolve();
				return deferred.promise;
			}

			this.fire('initializing', this);
			this.active = false;

			tcp.onReceive.addListener(this.onReceived.bind(this));
			tcp.onReceiveError.addListener(this.onReceivedError.bind(this));

			tcpServer.onAccept.addListener(this.onAccepted.bind(this));
			tcpServer.onAcceptError.addListener(this.onAcceptedError.bind(this));

			runtime.onSuspend.addListener(this.stop.bind(this));

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

			var getNets = function() {
				net.getNetworkInterfaces(setNet.bind(this));
			};

			this.stop()
			.then(getNets.bind(this));

			return deferred.promise;
		},

		onReceived: function(info) {
			info.message = Convert.arrayBufferToString(info.data);
			this.fire('received', info);
		},

		onReceivedError: function(info) {
			console.error("onReceiveError", info);
			this.fire('error', info);
		},

		onAccepted: function(info) {
			if (info.socketId != this.server.socketId) {
				console.info("Message to wrong server received", info, this);
				return;
			}
			this.fire('connection', info);
			tcp.setPaused(info.clientSocketId, false);
		},

		onAcceptedError: function(info) {
			console.error("onAcceptError", info);
			this.fire('error', info);
		}
	}

	return Socket;
}
]);
