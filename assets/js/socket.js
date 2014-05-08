angular.module('Clockdoc.Net')
.factory('Socket', ['$q', 'Progress', 'Convert',
function($q, Progress, Convert) {
	var tcpServer = chrome.sockets.tcpServer;
	var tcp = chrome.sockets.tcp;
	var net = chrome.system.network;
	var win = chrome.app.window;

	var Socket = function(name, persistent) {
		this.name = name;
		this.persistent = !!persistent;
		this.address = "127.0.0.1";
		this.port = 8888;

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
		this.serverSocketId = null;
		this.clientSocketId = null;
	}

	Socket.prototype = {

		on: function(event, callback) {
			this.listeners[event].push(callback);
		},

		fire: function(event, data) {
			if (event == 'error') {
				console.error(data);
			}
			this.listeners[event].forEach(function(callback) {
				callback(data);
			});
		},

		active: function() {
			return this.clientSocketId || this.serverSocketId;
		},

		parseConnectionString: function(str) {
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
		},

		connectToHost: function(socketInfo) {

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
					this.serverSocketId = socketInfo.socketId;
					deferred.resolve(this);
				}
			};

			var settings = {
				name: this.name + 'Client',
				persistent: this.persistent
			};

			var create = function() {
				tcp.create(settings, created.bind(this));
			};

			this.init().then(create.bind(this));

			return deferred.promise;
		},

		closeAll: function(owner) {
			// If an owner isn't specified, close both tcp and tcpServer sockets
			if (!owner) {

				var clearSocketIds = function() {
					this.serverSocketId = null;
					this.clientSocketId = null;
				};

				return this.closeAll(tcp)
				.then(this.closeAll.bind(this, tcpServer))
				.then(clearSocketIds.bind(this));
			}

			var deferred = $q.defer();

			var closeSockets = function(sockets) {
				var progress = new Progress(sockets.length, deferred.resolve);
				progress.name = "Closing sockets";

				if (!sockets || sockets.length == 0) {
					deferred.resolve();
				} 
				else {
					sockets.forEach(function(socket) {
						owner.close(socket.socketId, function() {
							progress.update();
						});
					});
				}
			};

			owner.getSockets(closeSockets.bind(this));
			return deferred.promise;
		},

		startHosting: function() {
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
				console.debug("Started hosting", info);
				this.serverSocketId = info.socketId;
				console.info("Listening on port", this.port, this);
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
		},

		getSocketInfo: function(socketId, method) {
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
		},

		getHostInfo: function() {
			return this.getSocketInfo(this.serverSocketId, tcpServer.getInfo);
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
		},

		init: function() {
			var deferred = $q.defer();

			this.serverSocketId = null;
			this.clientSocketId = null;

			if (this.initialized) {
				deferred.resolve();
				return deferred.promise;
			}

			this.fire('initializing', this);

			tcp.onReceive.addListener(this.onReceived.bind(this));
			tcp.onReceiveError.addListener(this.onReceivedError.bind(this));

			tcpServer.onAccept.addListener(this.onAccepted.bind(this));
			tcpServer.onAcceptError.addListener(this.onAcceptedError.bind(this));

			win.onClosed.addListener(this.closeAll.bind(this));

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

			this.closeAll()
			.then(getNets.bind(this));

			return deferred.promise;
		},

		onReceived: function(info) {
			info.message = Convert.arrayBufferToString(info.data);
			console.debug('RECEIVED', this, info);
			this.fire('received', info);
		},

		onReceivedError: function(info) {
			this.fire('error', info);
		},

		onAccepted: function(info) {
			console.debug('ACCEPTED', this, info);
			if (info.socketId != this.serverSocketId) {
				console.info("Message to wrong server received", info, this);
				return;
			}
			this.fire('connection', info);
			tcp.setPaused(info.clientSocketId, false);
		},

		onAcceptedError: function(info) {
			this.fire('error', info);
		}
	}

	return Socket;
}
]);
