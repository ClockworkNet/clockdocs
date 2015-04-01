/*global angular:false */
'use strict';

angular.module('Clockdoc.Models')
.factory('Doc', ['$filter', 'Random', 'Feature', function($filter, Random, Feature) {

	// Nodes are used to keep a flat record of the
	// internal tree structure of a document.
	function Node(section, parent, item) {
		this.section = section;
		this.parent = parent;
		this.item = item;

		this.type = null;
		this.index = null;
		this.level = null;
	}

	Node.prototype.calculateId = function() {
		var prefix = this.section ? this.section.title[0] : '';
		var parts = [this.index + 1];
		var parent = this.parent;
		while (parent && parent.type !== 'section') {
			parts.push(parent.index + 1);
			parent = parent.parent;
		}
		parts.reverse();
		return prefix + parts.join('.');
	};

	function Doc(root) {
		// Stores the data object for this document
		this.setRoot(root);
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
		'Future Phase',
		'Removed'
	];

	Doc.prototype.setRoot = function(root) {
		root = root || this.createRoot();

		this.root = root;

		// Hydrate the Feature objects
		if (this.root.sections) {
			for (var i=0; i<this.root.sections.length; i++) {
				this.root.sections[i] = new Feature(this.root.sections[i]);
			}
		}

		// Stores a flat object as an id => node lookup
		this.nodes = {};

		// Updte the nodes
		this.refresh();
	};

	Doc.prototype.createRoot = function() {
		return {
			title: '',
			author: '',
			created: new Date(),
			guid: Random.id(),
			revisions: [],
			sections: [],
			flags: [],
			files: []
		};
	};

	Doc.prototype.createFeature = function(title) {
		return new Feature({title: title});
	};

	Doc.prototype.createFlag = function(type) {
		var flag = {};
		Doc.flagTypes.some(function(f) {
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

	/**
	 * Called whenever the tree node structure changes. Refreshes
	 * the GUID lookup and updates feature ids.
	**/
	Doc.prototype.refresh = function() {
		if (!this.nodes) {
			this.nodes = {};
		}

		// The recursive function for refreshing items
		var refreshChildren = function(section, parent, nodes, level) {
			var type, kids;

			// We're at the root node
			if (parent.item.sections) {
				type = 'section';
				kids = parent.item.sections;
			}
			// We're in a section or feature
			else {
				type = 'feature';
				kids = parent.item.features;
			}

			if (!kids) {
				return;
			}

			for (var i=0; i<kids.length; i++) {
				var kid = kids[i];
				var node = new Node(section, parent, kid);

				node.index = i;
				node.level = level;
				node.type = type;

				nodes[kid.guid] = node;

				if (type === 'section') {
					section = kid;
					kid.id = kid.title[0];
				}
				else {
					kid.id = parent.item.id;
					if (parent.item.guid !== section.guid) {
						kid.id += '.';
					}
					kid.id += (i + 1);
				}

				refreshChildren(section, node, nodes, level + 1);
			}
		};

		var rootNode = new Node(null, null, this.root);
		refreshChildren(null, rootNode, this.nodes, 0);
	};

	// Creates a cache lookup to be used for getting 
	Doc.prototype.findNode = function(guid) {
		if (!guid) {return null;}

		if (!this.nodes[guid]) {
			this.refresh();
		}

		return this.nodes[guid];
	};

	Doc.prototype.eachFeature = function(callback) {
		for (var i=0; i<this.root.sections.length; i++) {
			this.root.sections[i].eachFeature(callback);
		}
	};

	Doc.prototype.insertSection = function(sectionIndex) {
		var section = this.createFeature('Untitled Section');
		this.root.sections.splice(sectionIndex, 0, section);
		this.refresh();
		return section;
	};

	Doc.prototype.deleteSection = function(index) {
		this.root.sections.splice(index, 1);
		this.refresh();
	};

	/// Feature methods ///
	Doc.prototype.deleteFeature = function(section, feature) {
		if (!section.eachFeature) {
			section = new Feature(section);
		}
		section.eachFeature(function(f, i, a) {
			if (f.guid !== feature.guid) {
				return true;
			}
			a.splice(i, 1);
			return false;
		});
		this.refresh();
	};

	Doc.prototype.insertFeature = function(features, featureIndex) {
		if (!features) {
			console.trace('Invalid features collection', arguments);
			return;
		}
		var feature = this.createFeature();
		featureIndex = featureIndex || features.length + 1;
		features.splice(featureIndex, 0, feature);
		this.refresh();
		return feature;
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
		return flag;
	};

	Doc.prototype.deleteFlag = function(flags, index) {
		flags.splice(index, 1);
	};

	Doc.prototype.moveItem = function(parentGuid, guid, newIndex) {
		// Find the item being moved
		var moved = this.findNode(guid);
		if (!moved) {
			console.error('Invalid moved item id', guid);
			return;
		}

		// Get the containing object where the item was dropped
		var parent = this.findNode(parentGuid || this.root.guid);
		if (!parent) {
			console.error('Could not find drop parent in rd', parentGuid);
			return;
		}

		var targetType = parent.item.guid === this.root.guid ? 'sections' : 'features';
		var originType = moved.parent.item.guid === this.root.guid ? 'sections' : 'features';

		// Out with the old
		moved.parent.item[originType].splice(moved.index, 1);

		// In with the new
		parent.item[targetType].splice(newIndex, 0, moved.item);

		this.refresh();
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
		if (!this.root.files) {
			this.root.files = {};
		}
		file.id = Random.id();
		this.root.files[file.id] = file;
	};

	Doc.prototype.removeFile = function(id) {
		if (!this.root.files) {return;}
		delete this.root.files[id];
	};

	Doc.prototype.getRevision = function() {
		var revs = this.root.revisions;
		if (!revs || revs.length === 0) {
			return 0.0;
		}
		return revs[revs.length - 1].revision;
	};

	Doc.prototype.exampleRevision = function() {
		var version = 1, revision = 0.1;
		if (this.root.revisions) {
			version = this.root.revisions.length + 1;
			revision = version / 10;
		}
		return {
			'id': Random.id(),
			'version': version,
			'revision': revision,
			'date': Doc.formatDate(new Date()),
			'notes': '',
			'author': ''
		};
	};

	Doc.prototype.addRevision = function() {
		if (!this.root.revisions) {
			this.root.revisions = [];
		}
		this.root.revisions.push(this.exampleRevision());
	};

	Doc.prototype.removeRevision = function(i) {
		if (!this.root.revisions) {return;}
		this.root.revisions.splice(i, 1);
	};

	Doc.formatDate = function(d) {
		return $filter('date')(d, 'yyyy-MM-dd');
	};

	return Doc;
}]);
