angular.module('Clockdoc.Utils')
.factory('Progress', [function() {
	function Progress(target, onComplete, onProgress) {
		this.target = target || 0;
		this.current = 0;
		this.failed = 0;
		this.skipped = 0;
		this.onComplete = onComplete;
		this.onProgress = onProgress;
		this.name = 'Progress';
	}

	Progress.prototype = {
		checkComplete: function() {
			if (this.onProgress) this.onProgress(this);
			if (this.current >= this.target) {
				this.complete();
			}
		},

		complete: function() {
			if (this.onComplete) this.onComplete(this);
		},

		// Call this when you want to mark a successful step
		update: function() {
			this.current++;
			this.checkComplete();
		},

		// Calls this when you want to mark a failure
		fail: function() {
			this.current++;
			this.failed++;
			this.checkComplete();
		},

		skip: function() {
			this.current++;
			this.skipped++;
			this.checkComplete();
		}
	};

	return Progress;
}]);
