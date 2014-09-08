/*global angular:false, $:false */
/*jslint bitwise: true */
'use strict';

angular.module('Clockdoc.Utils')
.service('ooxml', [function() {

	return function(html) {
		var parser = new DOMParser();
		var serializer = new XMLSerializer();
		var doc = parser.parseFromString('<root></root>', 'text/xml');

		function each(nodes, callback) {
			for (var i=0; i<nodes.length; i++) {
				callback(nodes[i], i, nodes);
			}
		}

		function toString(node) {
			var serialized = serializer.serializeToString(node);
			return serialized
				.replace(/<w:t>/g, '<w:t xml:space="preserve">')
				.replace(/val=/g, 'w:val=');
		}

		function node(parent, name, text) {
			var el = doc.createElement('w:' + name);
			if (text) {
				el.appendChild(doc.createTextNode(text));
			}
			parent.appendChild(el);
			return el;
		}

		function color(str) { // Return hex or named color
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

		function paragraph(parent, inNode, format) {
			var p = node(parent, 'p');
			var pr = node(p, 'pPr');

			var isUl = inNode.nodeName === 'UL';
			var isOl = inNode.nodeName === 'OL';

			if ((isUl || isOl) && inNode.childNodes) {
				var asList = function(p, pr) {
					var numPr = node(pr, 'numPr');
					var numId = isUl ? '9' : '5';
					node(numPr, 'ilvl').setAttribute('val', '0');
					node(numPr, 'numId').setAttribute('val', numId);
				};
				each(inNode.childNodes, function(listItem) {
					paragraph(parent, listItem, asList);
				});
				return;
			}

			if (format) {
				format(p, pr);
			}

			if (inNode.style && inNode.style.textAlign) {
				node(pr, 'jc')
					.setAttribute('val', inNode.style.textAlign);
			}

			if (inNode.nodeName === '#text') {
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
