angular.module('Clockdoc.Utils')
.factory('Progress', [function() {
	return function Progress(target, onComplete, onProgress) {
		this.target = target;
		this.done = 0;
		this.failed = 0;
		this.skipped = 0;

		var self = this;

		this.checkComplete = function() {
			if (onProgress) onProgress(self);
			if (onComplete && self.done >= self.target) {
				onComplete(self);
			}
		}

		// Call this when you want to mark a successful step
		this.update  = function() {
			self.done++;
			self.checkComplete();
		};

		// Calls this when you want to mark a failure
		this.fail = function() {
			self.done++;
			self.failed++;
			self.checkComplete();
		};

		this.skip = function() {
			self.done++;
			self.skipped++;
			self.checkComplete();
		};
	};
}]);
