/*global $:false, angular:false, Mustache:false */
'use strict';

angular.module('Clockdoc.Controllers')
.controller('NavCtrl', ['$scope', '$filter', '$timeout', '$http', '$q', '$window', 'FileSystem', 'File', 'Ooxml', function($scope, $filter, $timeout, $http, $q, $window, FileSystem, File, Ooxml) {

	var EXTENSION = 'cw';

	// Look for a file to open from the launch
	$($window).on('load', function() {
		if (!this.launchData || !this.launchData.entry) {
			return;
		}
		var entry = this.launchData.entry;
		var id = FileSystem.retain(entry);
		var file = new File(entry, id);
		readFile(file);
	});

	function loadTemplate(key) {
		var deferred = $q.defer();

		if (TEMPLATES[key].ready) {
			deferred.resolve(TEMPLATES[key].content);
			return deferred.promise;
		}

		var source = TEMPLATES[key].source;

		$http.get(source).then(function(rsp) {
			if (rsp.status !== 200) {
				return;
			}
			TEMPLATES[key].ready = true;
			TEMPLATES[key].content = rsp.data;
			deferred.resolve(rsp.data);
		});

		return deferred.promise;
	}

	function prepareForWord(src, doc) {
		var prepared = flattenDoc(doc);
		var ooxml = new Ooxml();

		var format = function(a, callback) {
			if (!a) {
				return;
			}
			a.forEach(function(item, ix, self) {
				self[ix].content = ooxml.add(item.content);
				if (callback) {
					callback(item);
				}
			});
		};

		var fixFlags = function(flags) {
			if (!flags) {
				return;
			}
			flags.forEach(function(flag, ix, self) {
				var html = $('<div><b>' + flag.title + ': </b>' + flag.content + '</div>');
				self[ix].content = ooxml.add(html);
			});
		};

		format(prepared.sections, function(section) {
			fixFlags(section.flags);
			var prefix = section.title[0];
			format(section.features, function(feature) {
				feature.prefix = prefix;
				fixFlags(feature.flags);
			});
		});

		prepared.date = $filter('date')(new Date(), 'yyyy-MM-dd');
		prepared.relationships = ooxml.relationships;

		var output = Mustache.render(src, prepared);
		output = output.replace(/[\n\r\t]/gm, ' ')
			.replace(/>\s+</gm, '><');

		return output;
	}

	var TEMPLATES = {
		'word': {
			'extension': 'docx',
			'source': 'templates/word.xml',
			'load': loadTemplate.bind(this, 'word'),
			'transform': prepareForWord.bind(this),
			'ready': false,
			'content' : null
		}
	};

	/*
	 * Reads the FileSystemEntry file contents and sets it on the app
	 */
	function readFile(file) {
		FileSystem.read(file)
		.then(function(file) {
			$scope.setWorking(false);
			if (!file || !file.content) {
				return;
			}
			try {
				var doc = angular.fromJson(file.content);
				$scope.loadDoc(doc);
				$scope.setFile(file);
			}
			catch (e) {
				console.error('file open error', e);
				$scope.warn('Error', 'There is a problem with your file.');
			}
		})
		.catch($scope.forgetFile.bind(null, file));
	}

	function flattenDoc(doc) {
		var flat = angular.copy(doc);
		if (!flat.sections) {
			return flat;
		}
		flat.sections.forEach(function(section) {
			if (!section.features) {
				return;
			}
			var flattened = flatten(section.features, 'features');
			section.features = flattened;
		});
		return flat;
	}

	/**
	 * Replaces a recursive array with a one-level
	 * array and adds level information as a x.x.x numbering system
	 * system to the title key. Very useful for rendering without
	 * using recursion!
	**/
	function flatten(a, childKey, levels) {
		var flattened = [];
		levels = levels || [];

		a.forEach(function(el, ix) {
			// Calculate the current level of this node
			var level = levels.slice(0);
			level.push(ix + 1);
			el.level = level.join('.');

			// The depth is bumped up by 1 to account for sections
			el.depth = level.length + 1;

			// Add to the flattened array
			flattened.push(el);

			// Add any children to the flattened array
			var children = el[childKey] ? el[childKey].slice(0) : [];
			var flatKids = flatten(children, childKey, level);
			flattened = flattened.concat(flatKids);
		});

		return flattened;
	}

	/// Filesystem Methods ///
	$scope.create = function(skipCheck) {
		if (!skipCheck && $scope.rdChanged) {
			return $scope.speedBump($scope.create.bind(this, true));
		}
		var doc = $scope.getSampleDoc('rd');
		$scope.loadDoc(doc);
		$scope.setFile({});
	};

	$scope.open = function(file, skipCheck) {
		if (!skipCheck && $scope.rdChanged) {
			return $scope.speedBump($scope.open.bind(this, file, true));
		}

		var entryId = file && file.entryId;

		var onError = function(e) {
			if (e.message !== FileSystem.MESSAGE_USER_CANCELLED) {
				console.error(e);
				$scope.clearFile(file);
				$scope.warn('Error', 'An error occurred.');
			}
			else {
				$scope.setWorking(false);
			}
		};

		var addLocations = function(restoredFile) {
			restoredFile.remote = file.remote;
			restoredFile.local = file.local;
			return restoredFile;
		};

		$scope.setWorking(true);

		if (entryId) {
			FileSystem.restore(entryId)
			.then(addLocations, onError)
			.then(readFile, onError);
		}
		else {
			FileSystem.openFile([EXTENSION, 'json'])
			.then(readFile, onError);
		}
	};

	$scope.title = function() {
		if ($scope.rd && $scope.rd.title) {
			return $scope.rd.title;
		}
		var file = $scope.files.current;
		if (file && file.entry && file.entry.name) {
			return file.entry.name;
		}
		return 'Untitled';
	};

	$scope.filename = function() {
		if ($scope.files.current && $scope.files.current.entry) {
			var name = $scope.files.current.entry.name;
			return name.substring(0, name.lastIndexOf('.'));
		}
		return $scope.rd && $scope.rd.title;
	};

	$scope.save = function() {
		if (!$scope.files.current.entryId) {
			$scope.saveAs();
			return;
		}
		var showMsg = $scope.warn.bind(this, 'Saved!', $scope.files.current.entry.name, 'info');
		var errMsg = $scope.warn.bind(this, 'Error!', $scope.files.current.entry.name + ' could not be saved');
		var content = angular.toJson($scope.rd, true);
		FileSystem.save($scope.files.current.entryId, content)
			.then($scope.rememberFile, errMsg)
			.then($scope.watchForChange, errMsg)
			.then(showMsg);
	};

	$scope.saveAs = function() {
		var rd = $scope.rd;
		var name = $scope.filename();
		var showMsg = $scope.warn.bind(this, 'Saved!', name, 'info');
		var errMsg = $scope.warn.bind(this, 'Error!', name + ' could not be saved');
		FileSystem.saveAs(name, EXTENSION, angular.toJson(rd, true))
			.then($scope.setFile, errMsg)
			.then($scope.watchForChange, errMsg)
			.then(showMsg);
	};

	$scope.export = function(format) {
		var name = $scope.filename();
		var template = TEMPLATES[format];
		var path = name + '.' + template.extension;

		var showMsg = $scope.warn.bind(this, 'Done!', path + ' has been exported', 'info');
		var errMsg = $scope.warn.bind(this, 'Error!', path + ' could not be exported');

		var render = function(full) {
			var output = template.transform(full, $scope.rd);
			FileSystem.saveAs(name, template.extension, output)
				.then(showMsg, errMsg);
		};

		template.load().then(render);
	};

	$scope.print = function() {
		window.print();
	};
}]);
