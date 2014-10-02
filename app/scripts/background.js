'use strict';

/**
 * Listens for the app launching then creates the window
 *
 * @see http://developer.chrome.com/apps/app.window.html
 */
chrome.app.runtime.onLaunched.addListener(function(launchData) {
	var MAIN_FILE = 'index.html';

	function LaunchData(launchData, entry) {
		this.data = launchData;
		if (!entry) {
			return;
		}
		this.id = entry.name;
		this.entry = entry;
	}

	function launch(data) {
		var opts = {
			'state': 'maximized'
		};
		if (typeof data !== 'undefined') {
			opts.id = data.id;
		}

		chrome.app.window.create(
			MAIN_FILE,
			opts,
			function(win) {
				win.contentWindow.launchData = data;
			}
		);
	}

	if (launchData && launchData.items) {
		for (var i=0; i<launchData.items.length; i++) {
			var item = launchData.items[i];
			var data = new LaunchData(launchData, item.entry);
			launch(data);
		}
	}
	else {
		launch(new LaunchData(launchData));
	}
});
