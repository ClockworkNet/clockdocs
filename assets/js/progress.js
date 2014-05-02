angular.module('Clockdoc.Utils')
.factory('Progress', [function() {
	return function Progress(target, onComplete, onProgress) {
		this.target  = target;
		this.done    = 0;
		this.failed  = 0;
		this.skipped = 0;

		// Call this when you want to mark a successful step
		this.update  = function() {
			this.done++;
			this.checkComplete();
		};

		// Calls this when you want to mark a failure
		this.fail = function() {
			this.done++;
			this.failed++;
			this.checkComplete();
		};

		this.skip = function() {
			this.done++;
			this.skipped++;
			this.checkComplete();
		};

		this.checkComplete = function() {
			if (onProgress) onProgress(this);
			if (onComplete && this.done >= this.target) {
				onComplete(this);
			}
		}
	};
}]);
