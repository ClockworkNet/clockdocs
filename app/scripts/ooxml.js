/*global angular:false, $:false */
/*jslint bitwise: true */
'use strict';

angular.module('Clockdoc.Utils')
.service('ooxml', [function() {

	/**
	 * Based on DOCX.js by Stephen Hardy https://github.com/stephen-hardy/DOCX.js
	**/
	return function(html) {
		var parser = new DOMParser();
		var serializer = new XMLSerializer();
		var doc = parser.parseFromString('<root></root>', 'text/xml');

		var styleMap = {
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

		/**
		 * Helper for looping through child nodes
		**/
		function each(nodes, callback) {
			for (var i=0; i<nodes.length; i++) {
				callback(nodes[i], i, nodes);
			}
		}

		/**
		 * Takes an OOXML node and returns a string version
		**/
		function toString(node) {
			var serialized = serializer.serializeToString(node);
			return serialized
				.replace(/<w:t>/g, '<w:t xml:space="preserve">')
				.replace(/val=/g, 'w:val=');
		}

		/**
		 * Generates a new node, attaches it to the specified parent,
		 * and returns the new node. If text is specified, it is added
		 * to the new node.
		**/
		function node(parent, name, text) {
			var el = doc.createElement('w:' + name);
			if (text) {
				el.appendChild(doc.createTextNode(text));
			}
			parent.appendChild(el);
			return el;
		}

		/**
		 * Takes the HTML-version of a color and returns the hex for it
		**/
		function color(str) {
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
		}

		/**
		 * Generates a OOXML run.
		**/
		function run(p, inNodeChild) {
			var r = node(p, 'r');

			if (inNodeChild.nodeName !== '#text') {
				var style = node(r, 'rPr');
				var tempStr = inNodeChild.outerHTML;

				for (var markup in styleMap) {
					if (tempStr.indexOf('<' + markup + '>') > -1) {
						var outMark = styleMap[markup];
						if (typeof outMark === 'object') {
							node(style, outMark.node)
								.setAttribute('val', outMark.val);
						}
						else {
							node(style, outMark);
						}
					}
				}

				var tempNode = inNodeChild.nodeName === 'SPAN' ? inNodeChild : inNodeChild.getElementsByTagName('SPAN')[0];
				if (tempNode && tempNode.style) {
					if (tempNode.style.fontSize) {
						node(style, 'sz')
							.setAttribute('val', parseInt(tempNode.style.fontSize, 10) * 2);
					}
					else if (tempNode.style.backgroundColor) {
						node(style, 'highlight')
							.setAttribute('val', color(tempNode.style.backgroundColor));
					}
					else if (tempNode.style.color) {
						node(style, 'color')
							.setAttribute('val', color(tempNode.style.color));
					}
				}
			}

			node(r, 't', inNodeChild.textContent);
		}

		/**
		 * Creates a new OOXML paragraph based on HTML input.
		**/
		function paragraph(parent, inNode, format, level) {
			level = level || 0;

			var isUl = inNode.nodeName === 'UL';
			var isOl = inNode.nodeName === 'OL';

			if (isUl || isOl) {
				if (!inNode.childNodes) {
					return;
				}
				var asList = function(p, pr) {
					var numPr = node(pr, 'numPr');

					// @todo: allow setting these ids
					var numId = isUl ? '9' : '5';

					node(numPr, 'ilvl').setAttribute('val', level);
					node(numPr, 'numId').setAttribute('val', numId);
				};

				each(inNode.childNodes, function(listItem) {
					paragraph(parent, listItem, asList, level + 1);
				});

				return;
			}

			var p = node(parent, 'p');
			var pr = node(p, 'pPr');

			if (format) {
				format(p, pr);
			}

			if (inNode.style && inNode.style.textAlign) {
				node(pr, 'jc')
					.setAttribute('val', inNode.style.textAlign);
			}

			if (inNode.nodeName === '#text' && inNode.nodeValue.length) {
				node(node(p, 'r'), 't', inNode.nodeValue);
				return;
			}

			if (!inNode.childNodes) {
				return;
			}

			each(inNode.childNodes, function(inNodeChild) {
				run(p, inNodeChild);
			});
		}


		var input = $('<div/>').html(html).get(0);
		var output = node(doc.getElementsByTagName('root')[0], 'body');

		each(input.childNodes, function(inNode) {
			paragraph(output, inNode);
		});

		var words = [];
		each(output.childNodes, function(node) {
			words.push(toString(node));
		});
		return words.join('');
	};
}]);
