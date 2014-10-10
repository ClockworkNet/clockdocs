/*global angular:false */
'use strict';

/* Used to store a reference to a file */
angular.module('Clockdoc.Models')
.factory('File', [function() {

	function Location(fullPath) {
		this.full = fullPath;
		this.dir = fullPath && fullPath.substr(0, fullPath.lastIndexOf('/'));
		this.file = fullPath && fullPath.split('/').reverse()[0];
	}

	function File(entry, entryId) {
		this.entry = entry;
		this.entryId = entryId;

		// The string representation of the file content
		this.content = null;

		// The local location
		this.local = null;

		// The remote location (SVN, most likely)
		this.remote = null;
	}

	File.Location = Location;

	return File;
}]);
