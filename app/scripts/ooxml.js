/*global angular:false, $:false */
/*jslint bitwise: true */
'use strict';

angular.module('Clockdoc.Utils')
.service('ooxml', [function() {

	return function(html) {
		var doc = new DOMParser().parseFromString('<root></root>', 'text/xml');

		function newXMLnode(name, text) {
			var el = doc.createElement('w:' + name);
			if (text) {
				el.appendChild(doc.createTextNode(text));
			}
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

		doc.getElementsByTagName('root')[0]
			.appendChild(newXMLnode('body'));

		var input = $('<div/>').html(html).get(0);
		var output = doc.getElementsByTagName('w:body')[0];

		for (var i=0; i<input.childNodes.length; i++) {
			var inNode = input.childNodes[i];
			var outNode = output.appendChild(newXMLnode('p'));
			if (inNode.style && inNode.style.textAlign) {
				outNode.appendChild(newXMLnode('pPr'))
					.appendChild(newXMLnode('jc'))
					.setAttribute('val', inNode.style.textAlign);
			}
			if (inNode.nodeName === '#text') {
				outNode.appendChild(newXMLnode('r'))
					.appendChild(newXMLnode('t', inNode.nodeValue));
			}
			else if (inNode.childNodes) {
				for (var j=0; j<inNode.childNodes.length; j++) {
					var inNodeChild = inNode.childNodes[j];
					var outNodeChild = outNode.appendChild(newXMLnode('r'));
					if (inNodeChild.nodeName !== '#text') {
						var styleAttrNode = outNodeChild.appendChild(newXMLnode('rPr'));
						var tempStr = inNodeChild.outerHTML;
						if (tempStr.indexOf('<b>') > -1) {
							styleAttrNode.appendChild(newXMLnode('b'));
						}
						if (tempStr.indexOf('<i>') > -1) {
							styleAttrNode.appendChild(newXMLnode('i'));
						}
						if (tempStr.indexOf('<u>') > -1) {
							styleAttrNode.appendChild(newXMLnode('u')).setAttribute('val', 'single');
						}
						if (tempStr.indexOf('<s>') > -1) {
							styleAttrNode.appendChild(newXMLnode('strike'));
						}
						if (tempStr.indexOf('<sub>') > -1) {
							styleAttrNode.appendChild(newXMLnode('vertAlign')).setAttribute('val', 'subscript');
						}
						if (tempStr.indexOf('<sup>') > -1) {
							styleAttrNode.appendChild(newXMLnode('vertAlign')).setAttribute('val', 'superscript');
						}
						var tempNode = inNodeChild.nodeName === 'SPAN' ? inNodeChild : inNodeChild.getElementsByTagName('SPAN')[0];
						if (tempNode) {
							if (tempNode && tempNode.style.fontSize) {
								styleAttrNode.appendChild(newXMLnode('sz'))
									.setAttribute('val', parseInt(tempNode.style.fontSize, 10) * 2);
							}
							else if (tempNode.style.backgroundColor) {
								styleAttrNode.appendChild(newXMLnode('highlight'))
									.setAttribute('val', color(tempNode.style.backgroundColor));
							}
							else if (tempNode.style.color) {
								styleAttrNode.appendChild(newXMLnode('color'))
									.setAttribute('val', color(tempNode.style.color));
							}
						}
					}
					outNodeChild.appendChild(newXMLnode('t', inNodeChild.textContent));
				}
			}
		}

		var serializer = new XMLSerializer();
		var serialized = serializer.serializeToString(output);
		return serialized
			.replace(/<w:t>/g, '<w:t xml:space="preserve">')
			.replace(/val=/g, 'w:val=');
	};
}]);
