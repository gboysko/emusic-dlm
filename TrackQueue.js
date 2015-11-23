var fs = require('fs'),
	async = require('async'),
	mkdirp = require('mkdirp'),
	request = require('request');

// Define our worker function...
function workerFn(task, callback) {
	var trackInfo = task.trackInfo,
	    emxFile = task.emxFile,
		msgHeader = 'Track #' + trackInfo.TRACKNUM + ': ' + trackInfo.TITLE + " (" + emxFile.getFilename() + "): ",
		statusFn = this.statusFn,
		destFilename = this.fileAndDirGenerator.nameFile(trackInfo),
		destDir = this.fileAndDirGenerator.nameDir(trackInfo),
		destPath = destDir + '/' + destFilename,
		totalChunkSize = 0,
		dotsWritten = 0,
		dotSize = 1024 * 100; /* 100KB */

	// Destination directory can be any arbitrary set of path elements. Create each as necessary.
	mkdirp(destDir, function(err, made) {
		// Error?
		if (err) {
			callback("Unable to create directory  '" + made + "': " + err);
		} else {
			var errMsg;

			// Perform the download...
			request.get(trackInfo.TRACKURL)
				.on('error', function(err) {
					/* Request? Response? (Both?) Error */
					statusFn(msgHeader + "Error!" + "\n");
					callback(err);
				})
				.on('data', function(chunk) {
					/* Data received - how many bytes? */
					var chunkSize;
					if (Buffer.isBuffer(chunk)) {
						chunkSize = chunk.length;
					} else {
						chunkSize = Buffer.byteLength(chunk);
					}

					// Increment the total chunk size
					totalChunkSize += chunkSize;

					// Should we draw a set of dots?
					if ((totalChunkSize - dotsWritten) > dotSize) {
						// How many?
						var dots = Math.floor((totalChunkSize - dotsWritten) / dotSize);

						// Draw them...
						statusFn(Array(dots+1).join("."));

						// Increment number of bytes that have dots...
						dotsWritten += dots * dotSize;
					}
				})
				.on('end', function() {
					/* No more data */
					statusFn("Done (recv: " + totalChunkSize + " bytes).\n");
					callback(errMsg);
				})
				.on('response', function(incomingMessage) {
					var contentLength = incomingMessage.headers['content-length'];

					// Got it?
					if (!contentLength) {
						errMsg = "Unable to retrieve the incoming content length.";
						contentLength = "??";
					}

					/* Response received */
					statusFn(msgHeader + "Starting (exp: " + contentLength + " bytes)");
				})
				.pipe(fs.createWriteStream(destPath));
		}
	});

}

function TrackQueue(statusFn, fileAndDirGenerator) {
	// Record our status function...
	this.statusFn = statusFn;

	// Save our name and directory generator object...
	this.fileAndDirGenerator = fileAndDirGenerator;

	// Create our internal queue object...
	this.queue = async.queue(workerFn.bind(this), 1);
}

TrackQueue.prototype.enqueue = function(task, callback) {
	this.queue.push(task, callback)
};

module.exports = TrackQueue;