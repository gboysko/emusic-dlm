var fs = require('fs'),
    xml2js = require('xml2js'), 
    Promise = require('bluebird');

// Promisify various modules...
Promise.promisifyAll(fs);
Promise.promisifyAll(xml2js);

// Constructor...
function EmxFile(f) {
	this.filename = f;
	this.trackListInfo = [];
}

EmxFile.prototype.getFilename = function() {
	return this.filename;
};

EmxFile.prototype.getTrackListInfo = function() {
	return this.trackListInfo;
};

EmxFile.prototype.parse = function() {
	var me=this;

	// Read the file contents...
	return fs.readFileAsync(this.filename)
		.then(function(data) {
			// Create a Parser to read the contents...
			var parser = new xml2js.Parser({explicitArray: true});

			return parser.parseStringAsync(data);
		})
		.then(function(result) {
			return new Promise(function(resolve, reject) {
				// Verify that we have a PACKAGE
				if (!('PACKAGE' in result)) {
					reject("Unexpected: PACKAGE not defined.");
					return;
				}
				var package = result.PACKAGE;
				if (typeof package !== 'object') {
					reject("Unexpected: PACKAGE is not an object.");
					return;
				}

				// Verify that we have an action
				if (!('ACTION' in package)) {
					reject("Unexpected: ACTION not defined.");
					return;
				}
				var action = package.ACTION;
				if (!Array.isArray(action)) {
					reject("Unexpected: ACTION is not an array.");
					return;
				}
				if (action.length !== 1) {
					reject("Unexpected: ACTION is not a single value.");
					return;
				}
				if (action[0] !== 'download') {
					reject("Unexpected: ACTION is not 'download'.");
					return;
				}

				// Verify that we have a TRACKLIST
				if (!('TRACKLIST' in package)) {
					reject("Unexpected: TRACKLIST is not under PACKAGE.");
					return;
				}
				var tracklist = package.TRACKLIST;
				if (!Array.isArray(tracklist)) {
					reject("Unexpected: TRACKLIST is not an array.");
					return;
				}

				// Loop through each TRACKLIST..
				var trackListInfo = [];				
				tracklist.forEach(function(t) {
					t.TRACK.forEach(function(trackElem) {
						// Loop through each TRACK...
						var trackInfo = {};

						// Extract each element...
						['TRACKURL', 'TRACKNUM', 'TITLE', 'ALBUM', 'ARTIST', 'EXTENSION'].forEach(function(elemName) {
							trackInfo[elemName] = trackElem[elemName].join("");
						});
						trackInfo.TRACKNAME = trackInfo.TITLE;

						// Add it to our array...
						trackListInfo.push(trackInfo);
					});
				});

				// Store a reference to it in our instance...
				me.trackListInfo = trackListInfo;

				// Return it!
				resolve(trackListInfo);
			});
		});
};

module.exports = EmxFile;