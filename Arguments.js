var fs = require('fs'),
	minimist = require('minimist');

var defaults = {
	fileSpec: [
		{type: 'TOKEN', value: 'ARTIST'},
		{type: 'TEXT',  value: ' - ', },
		{type: 'TOKEN', value: 'ALBUM'},
		{type: 'TEXT',  value: ' - '},
		{type: 'TOKEN', value: 'TRACKNUM'} ],
	subdirSpec: [],
	rootDir: '.'
}
function assert(expr, message, ch, parts) {
	if (!expr) {
		console.log("ch=" + ch);
		console.dir(parts);
		throw message;
	}
}

function processSpec(spec, trackInfo) {
	var pieces;

	// Loop through the parts...
	return spec.map(function(token) {
		// TEXT
		if (token.type === 'TEXT') {
			return token.value;
		} else if (token.type === 'TOKEN') {
			return trackInfo[token.value];
		}
	});
}

function parseSpec(s) {
	var chars = s.split(''), 
		parts = [],
		inPercent = false,
		part;

	// Function to handle a new TEXT character...
	function addTextChar(ch) {
		// No part?
		if (!part) {
			part = { type: 'TEXT', value: ''};
		}

		// Verify that the part is TEXT
		assert(part.type === 'TEXT', "Internal Error: Expecting part of type 'TEXT', but was '" + part.type + "'", ch, parts);

		// Append to the value...
		part.value += ch;
	}

	// Loop through each characters...
	for (var i=0; i<chars.length; i++) {
		// Are we "inside" a percent?
		if (inPercent) {
			// Verify that we are inside a TOKEN
			assert(part && part.type === 'TOKEN', "Internal Error: Expecting part of type 'TOKEN', but was '" + part.type + "'");

			// Are we looking at a percent?
			if (chars[i] === '%') {
				// Close the token...
				parts.push(part);

				// Delete the part...
				part = undefined;

				// No longer in percent...
				inPercent = false;
			} else {
				// Add to existing part...
				part.value += chars[i];
			}
		} else {
			// Are we looking at a percent?
			if (chars[i] === '%') {
				// Is the next character also a percent?
				if (i+1 < chars.length && chars[i+1] === '%') {
					// Treat as a character...
					addTextChar(chars[i]);

					// Increment our counter...
					i++;
				}

				// Is there a current part open?
				else {
					if (part) {
						// Push the current part on the list...
						parts.push(part);
					}

					// Create a new part
					part = { type: 'TOKEN', value: '' };

					// Indicate we are inside a percent...
					inPercent = true;
				}
			}
			else {
				// Add character to text...
				addTextChar(chars[i]);
			}
		}
	}

	// Do we have an open part?
	if (part) {
		// Verify that we are not inside a percent...
		if (part.type === 'TOKEN') {
			// Is it the last character?
			if (part.value === '') {
				throw "Including % at the end of a string. Please use %% to add a percent character.";
			}

			// Otherwise, some other problem...
			throw "Missing '%' in token named: " + part.value;
		}

		// If we have an open part, it must be text...
		assert(part.type === 'TEXT', "Internal Error: Expecting part of type 'TEXT', but was '" + part.type + "'");

		// Add it!
		parts.push(part);
	}

	return parts;
}

function parseDirSpec(s) {
	// Parse it!
	var parts = parseSpec(s);

	// Verify that we have at least one part...
	assert(parts.length > 0, "Internal Error: Unable to parse the string.");

	// Verify each token...
	parts.forEach(function(part) {
		// Is a token?
		if (part.type === 'TOKEN') {
			// Check for valid token name...
			// TODO Replace with Array.indexOf
			if (!['ARTIST', 'ALBUM'].some(function(t) { return part.value === t; })) {
				throw "Invalid token name: " + part.value;
			}
		}
	});

	return parts;
}

function parseFileSpec(s) {
	// Parse it!
	var parts = parseSpec(s);

	// Verify that we have at least one part...
	assert(parts.length > 0, "Internal Error: Unable to parse the string.");

	// Verify each token...
	parts.forEach(function(part) {
		// Is a token?
		if (part.type === 'TOKEN') {
			// Check for valid token name...
			if (!['ARTIST', 'ALBUM', 'TRACKNAME', 'TRACKNUM'].some(function(t) { return part.value === t; })) {
				throw "Invalid token name: " + part.value;
			}
		}

		// Is a text?
		else if (part.type === 'TEXT') {
			if (part.value.indexOf("/") >= 0) {
				throw "Slashes not allowed in file specification."
			}
		}
	});

	return parts;
}

function Arguments(args) {
	this.args = args;
	this.argv = new minimist(args);
}

Arguments.prototype.usage = function() {
	var scriptName = ((process.argv[1].split("/")).reverse())[0];

	console.log("Usage: %s [options]\n", scriptName);
	console.log("--watch-dir WD:         Monitor directory 'WD' for .emx files that are added to it.");
	console.log("                        No default--must be specified.\n");
	console.log("--root-dir RD:          Save downloaded music files into root directory 'RD'.");
	console.log("                        If omitted, defaults to the current working directory.\n");
	console.log("--sub-dir-spec DIRSPEC: Specifies how directories under the root directory are")
	console.log("                        created, based on dynamic tags, such as Album name or");
	console.log("                        Artist name. See 'Subdirectory Specification' for details.");
	console.log("                        If omitted, no subdirectories are created. All music files");
	console.log("                        are saved into the root directory.\n");
	console.log("--file-spec FILESPEC:   Specifies how music files under the subdirectories are")
	console.log("                        created, based on dynamic tags, such as Track Name, Track");
	console.log("                        Number, or other static text. See 'File Naming Specification'");
	console.log("                        for details.");
	console.log("                        If omitted, defaults to '%ARTIST% - %ALBUM% - %TRACKNUM%'\n");
	console.log("For more details, see https://github.com/gboysko/emusic-dlm");

	// Exit!
	process.exit();
};

Arguments.prototype.process = function() {
	// No command line arguments? 
	if (this.args.length === 0) {
		this.usage();
	}

	// Check for validity of the watch directory...
	if (!this.argv["watch-dir"]) {
		console.log("--watch-dir is omitted.");
		this.usage();
	}
	try {
		// Get stats for the argument...
		var stats = fs.statSync(this.argv["watch-dir"]);

		// Is it a directory?
		if (!stats.isDirectory()) {
			console.log("The value to --watch-dir is not a directory: %s", this.argv["watch-dir"]);
			this.usage();
		}

		// Remove it...
		this.watchDir = this.argv["watch-dir"];
		delete this.argv["watch-dir"];
	} catch (err) {
		console.log("--watch-dir does not refer to an existing directory: %s", this.argv["watch-dir"]);
		this.usage();
	}

	// Check for validity of the root directory...
	if (this.argv["root-dir"]) {
		try {
			// Get stats for the argument...
			var stats = fs.statSync(this.argv["root-dir"]);

			// Is it a directory?
			if (!stats.isDirectory()) {
				console.log("The value to --root-dir is not a directory: %s", this.argv["root-dir"]);
				this.usage();
			}

			// Remove it...
			this.rootDir = this.argv["root-dir"];
			delete this.argv["root-dir"];
		} catch (err) {
			console.log("--root-dir does not refer to an existing directory: %s", this.argv["root-dir"]);
			this.usage();
		}
	}

	// Check for validity of the subdirectory specification...
	if (this.argv["sub-dir-spec"]) {
		try {
			// Parse the argument into parts...
			this.subDirSpec = parseDirSpec(this.argv["sub-dir-spec"]);

			// Remove it...
			delete this.argv["sub-dir-spec"];
		} catch (err) {
			console.log("--sub-dir-spec is invalid:", err);
			this.usage();
		}
	}

	// Check for validity of the file specification...
	if (this.argv["file-spec"]) {
		try {
			// Parse the argument into parts...
			this.fileSpec = parseFileSpec(this.argv["file-spec"]);

			// Remove it...
			delete this.argv["file-spec"];
		} catch (err) {
			console.log("--file-spec is invalid:", err);
			this.usage();
		}
	}

	// Any remaining arguments?
	if (this.argv._.length > 0) {
		console.log("Extra command line arguments:", this.argv._.join(" "));
		this.usage();
	}

	// Remove array...
	delete this.argv._;

	// Any other arguments?
	for (var n in this.argv) {
		console.log("Unexpected flags:", Object.keys(this.argv).join(", "));
		this.usage();
	}
};

Arguments.prototype.getRootDir = function() {
	return this.rootDir || defaults.rootDir;
};

Arguments.prototype.getWatchDir = function() {
	return this.watchDir;
};

Arguments.prototype.getFileSpec = function() {
	return this.fileSpec || defaults.fileSpec;
};

Arguments.prototype.getSubdirSpec = function() {
	return this.subDirSpec || defaults.subdirSpec;
};

Arguments.prototype.getFileName = function(trackInfo) {
	return processSpec(this.getFileSpec(), trackInfo).concat(trackInfo.EXTENSION).join("");
};

Arguments.prototype.getSubdirName = function(trackInfo) {
	return [this.getRootDir(), processSpec(this.getSubdirSpec(), trackInfo).join("")].join("/");
}

module.exports = Arguments;