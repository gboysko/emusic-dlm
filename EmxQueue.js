var async = require('async');

function workerFn(emxFile, callback) {
	var trackQueue = this.trackQueue,
		trackStatusArray = [];

	// Define a function to generate callbacks...
	function genCallback(index, total) {
		return function (err) {
			// Record status...
			trackStatusArray.push((err) ? false : true);

			// Is this the last track to record status?
			if (trackStatusArray.length === total) {
				var success = trackStatusArray.reduce(function(prevValue, currValue, currIndex, array) { return prevValue && currValue; }, true);

				// Invoke our outer callback...
				callback((success) ? undefined : "At least one track failed to download.");
			}
		}
	}

	// Iterate through each track 
	emxFile.getTrackListInfo().forEach(function(trackInfo, index, array) {
		// Put it on the track queue...
		trackQueue.enqueue({emxFile: emxFile, trackInfo: trackInfo}, genCallback(index, array.length));
	});
}

function EmxQueue(statusFn, trackQueue) {
	// Store our status function...
	this.statusFn = statusFn;

	// Store our track queue...
	this.trackQueue = trackQueue;

	// Create our queue
	this.queue = async.queue(workerFn.bind(this), 1);
}

EmxQueue.prototype.enqueue = function(task, callback) {
	this.queue.push(task, callback);
};

module.exports = EmxQueue;