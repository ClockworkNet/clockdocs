/*global angular:false, $:false */
/*jslint bitwise: true */
'use strict';

angular.module('Clockdoc.Utils')
.service('Ooxml', [function() {

	function Hyperlink(url, index) {
		this.index = index;
		this.id = 'rId' + (100 + index);
		this.type = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink';
		this.target = url;
		this.targetMode = 'External';
	}

	/**
	 * Based on DOCX.js by Stephen Hardy https://github.com/stephen-hardy/DOCX.js
	**/
	function Ooxml() {
		this.parser = new DOMParser();
		this.serializer = new XMLSerializer();
		this.doc = this.parser.parseFromString('<root></root>', 'text/xml');

		this.relationships = [];
		this.lines = [];

		this.olId = 5;
		this.ulId = 9;

		// Stores the HTML -> OOXML tag conversions
		this.styleMap = {
			'b'      : 'b',
			'strong' : 'b',
			'i'      : 'i',
			'em'     : 'i',
			'u'      : {
				'node' : 'u',
				'val'  : 'single'
			},
			's'      : 'strike',
			'strike' : 'strike',
			'sub'    : {
				'node' : 'vertAlign',
				'val'  : 'subscript'
			},
			'sup'    : {
				'node' : 'vertAlign',
				'val'  : 'superscript'
			}
		};
	}

	Ooxml.prototype.add = function(html) {
		var input = $('<div/>').html(html).get(0);
		var output = this._node(this.doc.getElementsByTagName('root')[0], 'body');

		this._each(input.childNodes, function(inNode) {
			this._paragraph(output, inNode);
		});

		var words = [];
		this._each(output.childNodes, function(node) {
			words.push(this._string(node));
		});

		var lines = words.join('');
		this.lines.push(lines);

		return lines;
	};

	/**
	 * Takes the HTML-version of a color and returns the hex for it
	**/
	Ooxml.prototype.color = function(str) {
		if (str.charAt(0) === '#') {
			return str.substr(1);
		}
		if (str.indexOf('rgb') < 0) {
			return str;
		}
		var values = /rgb\((\d+), (\d+), (\d+)\)/.exec(str),
			red = +values[1],
			green = +values[2],
			blue = +values[3];
		return (blue | (green << 8) | (red << 16)).toString(16);
	};

	/**
	 * Helper for looping through child nodes
	**/
	Ooxml.prototype._each = function(nodes, callback) {
		for (var i=0; i<nodes.length; i++) {
			callback.call(this, nodes[i], i, nodes);
		}
	};

	/**
	 * Takes an OOXML node and returns a string version
	**/
	Ooxml.prototype._string = function(node) {
		var serialized = this.serializer.serializeToString(node);
		return serialized
			.replace(/<w:t>/g, '<w:t xml:space="preserve">')
			.replace(/val=/g, 'w:val=')
			.replace(/id=/g, 'r:id=');
	};

	/**
	 * Generates a new node, attaches it to the specified parent,
	 * and returns the new node. If text is specified, it is added
	 * to the new node.
	**/
	Ooxml.prototype._node = function(parent, name, text) {
		var el = this.doc.createElement('w:' + name);
		if (text) {
			el.appendChild(this.doc.createTextNode(text));
		}
		parent.appendChild(el);
		return el;
	};

	/**
	 * Creates a new OOXML paragraph based on HTML input.
	**/
	Ooxml.prototype._paragraph = function(parent, inNode, format, level) {
		level = level || 0;

		var isUl = inNode.nodeName === 'UL';
		var isOl = inNode.nodeName === 'OL';

		if (isUl || isOl) {
			if (!inNode.childNodes) {
				return;
			}
			var asList = function(p, pr) {
				var numPr = this._node(pr, 'numPr');

				// @todo: allow setting these ids
				var numId = isUl ? this.ulId : this.olId;

				this._node(numPr, 'ilvl').setAttribute('val', level);
				this._node(numPr, 'numId').setAttribute('val', numId);
			};

			this._each(inNode.childNodes, function(listItem) {
				this._paragraph(parent, listItem, asList, level + 1);
			});

			return;
		}

		var p = this._node(parent, 'p');
		var pr = this._node(p, 'pPr');

		if (format) {
			format.call(this, p, pr);
		}

		if (inNode.style && inNode.style.textAlign) {
			this._node(pr, 'jc')
				.setAttribute('val', inNode.style.textAlign);
		}

		if (inNode.nodeName === '#text' && inNode.nodeValue.length) {
			this._node(this._node(p, 'r'), 't', inNode.nodeValue);
			return;
		}

		if (!inNode.childNodes) {
			return;
		}

		this._each(inNode.childNodes, function(inNodeChild) {
			this._run(p, inNodeChild);
		});
	};

	/**
	 * Generates a OOXML run.
	**/
	Ooxml.prototype._run = function(p, inNodeChild) {
		var hyperlink = inNodeChild.nodeName === 'A';

		// Wrap the run in a hyperlink element if needed.
		if (hyperlink) {
			p = this._node(p, 'hyperlink');
			var url = inNodeChild.getAttribute('href');
			var rel = new Hyperlink(url, this.relationships.length);
			this.relationships.push(rel);
			p.setAttribute('id', rel.id);
		}

		var r = this._node(p, 'r');

		if (inNodeChild.nodeName === '#text') {
			this._node(r, 't', inNodeChild.textContent);
			return;
		}

		var style = this._node(r, 'rPr');
		var tempStr = inNodeChild.outerHTML;

		if (hyperlink) {
			this._node(style, 'rStyle')
				.setAttribute('val', 'Hyperlink');
		}

		// Replace simple HTML markup with OOXML versions
		for (var markup in this.styleMap) {
			if (tempStr.indexOf('<' + markup + '>') > -1) {
				var outMark = this.styleMap[markup];
				if (typeof outMark === 'object') {
					this._node(style, outMark.node)
						.setAttribute('val', outMark.val);
				}
				else {
					this._node(style, outMark);
				}
			}
		}

		var tempNode = inNodeChild.nodeName === 'SPAN' ? inNodeChild : inNodeChild.getElementsByTagName('SPAN')[0];
		if (tempNode && tempNode.style) {
			if (tempNode.style.fontSize) {
				this._node(style, 'sz')
					.setAttribute('val', parseInt(tempNode.style.fontSize, 10) * 2);
			}
			else if (tempNode.style.backgroundColor) {
				this._node(style, 'highlight')
					.setAttribute('val', this.color(tempNode.style.backgroundColor));
			}
			else if (tempNode.style.color) {
				this._node(style, 'color')
					.setAttribute('val', this.color(tempNode.style.color));
			}
		}

		this._node(r, 't', inNodeChild.textContent);
	};

	return Ooxml;
}]);
