/*global angular:false */
'use strict';

angular.module('Clockdoc.Models')
.factory('Doc', ['$filter', 'Random', function($filter, Random) {

	function Doc() {
		this.title = 'Untitled Requirements Document';
		this.author = 'Anonymous';
		this.created = new Date();
		this.guid = Random.id();
		this.revisions = [this.exampleRevision()];
		this.sections = [
			this.createFeature('Definitions and Conventions'),
			this.createFeature('Features'),
			this.createFeature('Production'),
			this.createFeature('Technology'),
			this.createFeature('Security')
		];
		this.flags = [];
		this.files = [];
	}

	Doc.flagTypes = [
		{
			type: 'definition',
			name: 'Definition',
			title: ''
		},
		{
			type: 'dev_note',
			name: 'Dev Note',
			title: 'Dev Note'
		},
		{
			type: 'open_question',
			name: 'Open Question',
			title: 'Open Question'
		},
		{
			type: 'assumption',
			name: 'Assumption',
			title: 'Assumption'
		}
	];

	Doc.availableTags = [
		'Out of Scope',
		'Future Phase'
	];

	Doc.prototype.createFeature = function(title) {
		title = title || 'Untitled';
		var feature = {
			'title': title,
			'guid': Random.id(),
			'content': '',
			'features': [],
			'flags': [],
			'tags': []
		};
		return feature;
	};

	Doc.prototype.createFlag = function(type) {
		var flag = {};
		this.flagTypes.some(function(f) {
			if (f.type === type) {
				flag = f;
				return true;
			}
		});
		return {
			'title': flag.title,
			'guid': Random.id(),
			'type': flag.type,
			'content': ''
		};
	};

	// Creates a cache lookup to be used for getting 
	Doc.prototype.findItem = function(id, parent) {
		if (!id) {return null;}
		parent = parent || this;

		if (parent.guid === id) {
			return {
				index: 0,
				item: parent
			};
		}

		var checkChildren = function(a, type) {
			if (!a) {return null;}
			for (var i=0; i<a.length; i++) {
				var o = a[i];
				if (o.guid === id) {
					return {
						index: i,
						item: o,
						parent: {
							item: parent,
							type: type
						}
					};
				}
				var childItem = this.findItem(id, o);
				if (childItem) {return childItem;}
			}
			return null;
		};

		var childTypes = ['features', 'sections'];

		for (var i=0; i<childTypes.length; i++) {
			var ct = childTypes[i];
			var item = checkChildren(parent[ct], ct);
			if (item) {return item;}
		}

		return null;
	};

	// Recursively access each feature in a section;
	// Until the callback returns false
	Doc.prototype.eachItem = function(section, key, callback, level) {
		if (!section[key] || !section[key].some) {return;}
		level = level || 0;
		var each = this.eachItem.bind(this);
		section[key].some(function(f, i) {
			var go = callback(f, i, section[key], level);
			if (go === false) {
				return true;
			}
			each(f, key, callback, level + 1);
		});
	};

	Doc.prototype.insertSection = function(sectionIndex) {
		var section = this.createFeature('Untitled Section');
		this.sections.splice(sectionIndex, 0, section);
	};

	Doc.prototype.deleteSection = function(index) {
		this.sections.splice(index, 1);
	};

	/// Feature methods ///
	Doc.prototype.deleteFeature = function(section, feature) {
		this.eachItem(section, 'features', function(f, i, a) {
			if (f.guid !== feature.guid) {
				return true;
			}
			a.splice(i, 1);
			return false;
		});
	};

	Doc.prototype.insertFeature = function(features, featureIndex) {
		if (!features) {
			console.trace('Invalid features collection', arguments);
			return;
		}
		var feature = this.createFeature();
		featureIndex = featureIndex || features.length + 1;
		features.splice(featureIndex, 0, feature);
	};

	/// Tag methods ///
	Doc.prototype.featureHasTag = function(feature, tag) {
		return feature.tags && feature.tags.indexOf(tag) >= 0;
	};

	Doc.prototype.toggleTag = function(feature, tag) {
		if (this.featureHasTag(feature, tag)) {
			this.removeTag(feature, tag);
		}
		else {
			this.addTag(feature, tag);
		}
	};

	Doc.prototype.addTag = function(feature, tag) {
		if (!feature.tags) {
			feature.tags = [];
		}
		feature.tags.push(tag);
	};

	Doc.prototype.removeTag = function(feature, tag) {
		feature.tags = feature.tags.filter(function(t) {
			return tag !== t;
		});
	};

	/// Flag methods ///
	Doc.prototype.insertFlag = function(flags, type) {
		if (!flags) {
			return;
		}
		var flag = this.createFlag(type);
		flags.push(flag);
	};

	Doc.prototype.deleteFlag = function(flags, index) {
		flags.splice(index, 1);
	};

	Doc.prototype.moveItem = function(parentGuid, guid, newIndex) {
		// Find the item being moved
		var moved = this.findItem(guid);
		if (!moved) {
			console.error('Invalid moved item id', guid);
			return;
		}

		// Get the containing object where the item was dropped
		var parent = this.findItem(parentGuid || this.guid);
		if (!parent) {
			console.error('Could not find drop parent in rd', parentGuid);
			return;
		}
		var targetType = parent.item.guid === this.guid ? 'sections' : 'features';

		// Out with the old
		moved.parent.item[moved.parent.type].splice(moved.index, 1);

		// In with the new
		parent.item[targetType].splice(newIndex, 0, moved.item);
	};

	Doc.prototype.moveFlag = function(flags, parentGuid, guid, newIndex) {
		var currentIndex = -1;
		var flag = null;
		for (var i=0; i<flags.length; i++) {
			if (flags[i].guid === guid) {
				flag = flags[i];
				currentIndex = i;
				break;
			}
		}
		if (currentIndex < 0) {
			console.error('Invalid flag guid', guid);
			return;
		}

		flags.splice(currentIndex, 1);
		flags.splice(newIndex, 0, flag);
	};

	Doc.prototype.addFile = function(file) {
		if (!this.files) {
			this.files = {};
		}
		file.id = Random.id();
		this.files[file.id] = file;
	};

	Doc.prototype.removeFile = function(id) {
		if (!this.files) {return;}
		delete this.files[id];
	};

	Doc.prototype.getRevision = function() {
		var revs = this.revisions;
		if (!revs) {
			return 0.0;
		}
		return revs[revs.length - 1].revision;
	};

	Doc.protoype.formatDate = function(d) {
		return $filter('date')(d, 'yyyy-MM-dd');
	};

	Doc.prototype.exampleRevision = function() {
		var version = 1, revision = 0.1;
		if (this.revisions) {
			version = this.revisions.length + 1;
			revision = version / 10;
		}
		return {
			'id': Random.id(),
			'version': version,
			'revision': revision,
			'date': this.formatDate(new Date()),
			'notes': '',
			'author': ''
		};
	};

	Doc.prototype.addRevision = function() {
		if (!this.revisions) {
			this.revisions = [];
		}
		this.revisions.push(this.exampleRevision());
	};

	Doc.prototype.removeRevision = function(i) {
		if (!this.revisions) {return;}
		this.revisions.splice(i, 1);
	};

	return Doc;
}]);
