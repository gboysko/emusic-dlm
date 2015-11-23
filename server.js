#! /usr/bin/env node

var chokidar = require('chokidar'),
	http = require('http'),
	Arguments = require("./Arguments"),
	EmxFile = require("./EmxFile"),
	TrackQueue = require("./TrackQueue"),
	EmxQueue = require("./EmxQueue"),
	Promise = require('bluebird'),
	mkdirp = require('mkdirp'),
	osenv = require('osenv'),
	moment = require('moment'),
	mv = require('mv');

// Initialize our arguments...
var arguments = new Arguments(process.argv.slice(2));

// Process the arguments!
arguments.process();

// Hardcoded strings (for now)...
var watchFileSpec = '*.emx';

// TODO: Look for these values on the command line. Fail if absent or if either directory does not exist.
var watchDir = arguments.getWatchDir(),
	rootDestDir = arguments.getRootDir();

// Object to name files and directories...
function fileAndDirGen(a) {
	return {
		nameFile: function(trackInfo) {
			return a.getFileName(trackInfo);
		},
		nameDir: function(trackInfo) {
			return a.getSubdirName(trackInfo);
		}
	};
};

// Create a processing queue for individual tracks...
var trackQueue = new TrackQueue(process.stdout.write.bind(process.stdout), fileAndDirGen(arguments));

// Create a processing queue for EMX files...
var fileQueue = new EmxQueue(process.stdout.write.bind(process.stdout), trackQueue);

// Start to watch for new EMX files in the WATCHED directory
var watcher = chokidar.watch(watchDir + '/' + watchFileSpec, {depth: 1}).on('add', function(path, stats) {
	// Status...
	process.stdout.write(path + ": Detected EMX File...\n");

	// Create an EmxFile instance...
	var emxFile = new EmxFile(path);

	// Parse it...
	emxFile.parse().then(function (trackListInfo) {
		// Create a new Promise...
		return new Promise(function(resolve, reject) {
			// Status...
			process.stdout.write(path + ": Found " + trackListInfo.length + " track" + ((trackListInfo.length == 1) ? "" : "s") + ".\n");

			// Push the file on processing queue...
			fileQueue.enqueue(emxFile, function(err) {
				// Status...
				process.stdout.write(path + ": Done\n");

				// Did it succeed or fail?
				if (err) {
					reject(path + ": " + err);
				} else {
					resolve(path);
				}
			});
		});
	}).then(function(emxFilePath) {
		// Create a new Promise...
		return new Promise(function(resolve, reject) {
			var emusicDir = osenv.home() + "/" + ".emusic-dlm";

			// Save the file to the user's home directory...
			mkdirp(emusicDir, function(err, made) {
				// Created directory?
				if (made) {
					process.stdout.write("Created directory: " + made + "\n");
				}

				// Error?
				if (err) {
					reject(emxFilePath + ": Failed to create directory '" + emusicDir + "': " + err);
					return;
				}

				// Create the target file name...
				var newFileName = moment().format('YYYY-MM-DD_HHmm[.emx]'),
					newFilePath = emusicDir + "/" + newFileName;
				mv(emxFilePath, newFilePath, function(err) {
					// Error?
					if (err) {
						reject("Could not move " + emxFilePath + " to " + newFilePath + ": " + err);
						return;
					}

					// Success!
					process.stdout.write(emxFilePath + ": Moved (and renamed) to " + newFilePath + "\n");
					resolve(newFilePath);
				});
			});
		});
	}).catch(function(err) {
		console.error(err);
	});
});

// Create an HTTP Server to force the process to wait (indefinitely)...
http.createServer(function (req, res) { res.end(); }).listen(1234);
