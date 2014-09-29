/*global $:false, angular:false, Mustache:false */
'use strict';

angular.module('Clockdoc.Controllers')
.controller('NavCtrl', ['$scope', '$filter', '$timeout', '$http', '$q', 'FileSystem', 'LocalStorage', 'Ooxml', function($scope, $filter, $timeout, $http, $q, FileSystem, LocalStorage, Ooxml) {

	var EXTENSION = 'cw';
	var RECENT_ENTRIES = 'recent_entries';
	var RECENT_ENTRIES_MAX = 5;

	function saveFirst(nextAction) {
		// @todo: add confirmation to a dialog on screen
		$scope.rdChanged = true;
		$scope.warn('Uh oh', 'You lost your work!');
		nextAction();
	}

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

	$scope.recentEntries = [];

	function unique(a, key) {
		var seen = {}, u = [];
		a.forEach(function(item) {
			var value = item[key];
			if (seen[value]) {
				return;
			}
			seen[value] = 1;
			u.push(item);
		});
		return u;
	}

	// Load up the initial set of recent entries
	LocalStorage.get(RECENT_ENTRIES)
	.then(function(results) {
		$scope.recentEntries = unique(results, 'entryId');
	});

	/**
	 *¬Forgets the specified entry and shows an error message
	**/
	function forgetEntry(entryId, e) {
		$scope.recentEntries = $scope.recentEntries.filter(function(r) {
			return r.entryId !== entryId;
		});
		$scope.setWorking(false);
		$scope.setResult(null);
		LocalStorage.set(RECENT_ENTRIES, $scope.recentEntries);
		console.error('file error', e);

		if (e.message !== FileSystem.MESSAGE_USER_CANCELLED) {
			$scope.warn('Error', 'There was a problem opening your file.');
		}
	}

	/**
	 * Remembers a recent entry into LocalStorage¬
	**/
	function rememberEntry(result) {
		if (result) {
			$scope.setResult(result);
		}

		if (!$scope.result || !$scope.result.entryId) {
			return;
		}

		var entries = $scope.recentEntries;

		if (!entries) {
			entries = [];
		}

		var newEntry = {
			entryId: $scope.result.entryId,
			name: $scope.result.entry.name,
			title: $scope.rd && $scope.rd.title,
			date: new Date()
		};

		$scope.result.getDisplayPath()
		.then(function(path) {
			newEntry.path = path;

			// Add the entry to the top
			entries.splice(0, 0, newEntry);

			// Trim the array of entries
			entries = unique(entries, 'path').slice(0, RECENT_ENTRIES_MAX);

			LocalStorage.set(RECENT_ENTRIES, entries)
			.then(function() {
				$scope.recentEntries = entries;
			});
		});
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
			saveFirst($scope.create.bind(this, true));
		}
		var doc = $scope.getSampleDoc('rd');
		$scope.loadDoc(doc);
		$scope.setResult({});
	};

	$scope.open = function(entryId, skipCheck) {
		if (!skipCheck && $scope.rdChanged) {
			saveFirst($scope.open.bind(this, entryId, true));
		}
		var onError = forgetEntry.bind(null, entryId);
		var readResult = function(result) {
			FileSystem.read(result)
			.then(function(result) {
				$scope.setWorking(false);
				if (!result || !result.content) {
					return;
				}
				try {
					$scope.loadDoc(angular.fromJson(result.content));
					rememberEntry(result);
				}
				catch (e) {
					console.error('file open error', e);
					$scope.warn('Error', 'There is a problem with your file.');
				}
			})
			.catch(onError);
		};
		$scope.setWorking(true);
		if (entryId) {
			FileSystem.restore(entryId)
			.then(readResult, onError);
		}
		else {
			FileSystem.openFile([EXTENSION, 'json'])
			.then(readResult, onError);
		}
	};

	$scope.filename = function() {
		if ($scope.result && $scope.result.entry) {
			var name = $scope.result.entry.name;
			return name.substring(0, name.lastIndexOf('.'));
		}
		return $scope.rd && $scope.rd.title;
	};

	$scope.save = function() {
		if (!$scope.result.entryId) {
			$scope.saveAs();
			return;
		}
		var showMsg = $scope.warn.bind(this, 'Saved!', $scope.result.entry.name, 'info');
		var errMsg = $scope.warn.bind(this, 'Error!', $scope.result.entry.name + ' could not be saved');
		var content = angular.toJson($scope.rd, true);
		FileSystem.save($scope.result.entryId, content)
			.then(rememberEntry, errMsg)
			.then(showMsg);
	};

	$scope.saveAs = function() {
		var rd = $scope.rd;
		var name = $scope.filename();
		var showMsg = $scope.warn.bind(this, 'Saved!', name, 'info');
		var errMsg = $scope.warn.bind(this, 'Error!', name + ' could not be saved');
		FileSystem.saveAs(name, EXTENSION, angular.toJson(rd, true))
			.then(rememberEntry, errMsg)
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
