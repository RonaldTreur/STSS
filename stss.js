var fs = require('fs'),
	chalk = require('chalk'),
	async = require('async'),
	EventEmitter = require('events').EventEmitter,
	util = require('util'),
	stss2scss = require('./lib/renderer/stss2scss'),
	scss2css = require('./lib/renderer/scss2css'),
	css2json = require('./lib/renderer/css2json'),
	json2tss = require('./lib/renderer/json2tss');

/**
 * @class STSS
 * @extends events.EventEmitter
 *
 * Manages STSS to TSS conversion.
 * @author Ronald Treur
 */
var STSS = function() {
	// Apply parent constructor
	EventEmitter.call(this);
};

// Extend EventEmitter
util.inherits(STSS, EventEmitter);


/**
 * Convert the supplied SCSS structured markup into TSS.
 *
 * This function executes asynchronously.
 *
 * @private
 * @param 	{String}	scss 				SCSS structured markup
 * @param 	{Object}	options				Dictionary containing instructions
 * @param 	{Function} 	options.success 	Callback that will be called upon successful conversion
 * @param  	{Function}	[options.error]		Callback that will be called if conversion fails
 * @param 	{String} 	[options.shFile]	JSON file that contains additional shorthand notation to use during conversion
 * @param 	{Function}	log 				Function that logs the current state of the process
 */
function process(stss, options, log) {
	async.waterfall([
		function(callback) {
			var scss = stss2scss(stss, options);
			log('scss', scss);
			callback(null, scss);
		},
		function(scss, callback) {
			var css = scss2css(scss, options);
			log('css', css);
			callback(null, css);
		},
		function(css, callback) {
			var json = css2json(css, options);
			log('json', JSON.stringify(json, null, 2));
			callback(null, json);
		},
		function(json, callback) {
			var tss = json2tss(json, options);
			log('tss', tss);
			callback(null, tss);
		},
	], function(err, tss) {
		if (err) { 
			options.error && options.error(err);
		} else {
			options.success(tss);
		}
	});
}

/**
 * Convert the supplied SCSS structured markup into TSS.
 *
 * This function executes synchronously.
 *
 * @private
 * @param 	{String}	scss 				SCSS structured markup
 * @param 	{Object}	options				Dictionary containing instructions
 * @param 	{Function} 	options.success 	Callback that will be called upon successful conversion
 * @param  	{Function}	[options.error]		Callback that will be called if conversion fails
 * @param 	{String} 	[options.shFile]	JSON file that contains additional shorthand notation to use during conversion
 * @param 	{Function}	log 				Function that logs the current state of the process
 * @return 	{String} 						TSS structured markup
 */
function processSync(stss, options, log) {
	var scss = stss2scss(stss, options);
	log('scss', scss);
	var css = scss2css(scss, options);
	log('css', css);
	var json = css2json(css, options);
	log('json', JSON.stringify(json, null, 2));
	var tss = json2tss(json, options);
	log('tss', tss);
	return tss;
}


function parseOptions(options) {
	if (options.shFile) {
		if (!fs.existsSync(options.shFile)) {
 			throw new Error('Shorthand file does not exist: '+ options.shFile);
	 	} else {
	 		options.shorthand = require(options.shFile);
	 	}
	}

	return options;
}

/**
 * Render STSS to TSS using the supplied instructions.
 *
 * Either options.data or options.file need to be provided. If both are supplied, data takes precedence and file
 * will be ignored.
 * Likewise, either options.outFile or options.success should be defined, or both.
 *
 * This function executes asynchronously.
 * 
 * @param 	{Object}	options				Dictionary containing instructions
 * @param 	{String} 	[options.data]		STSS data, required if options.file is not passed
 * @param 	{String} 	[options.file]		STSS file that is to be converted
 * @param 	{String} 	[options.outFile]	File that is created/overwritten with the generated TSS output
 * @param 	{Function} 	[options.success] 	Callback that will be called upon successful conversion
 * @param  	{Function}	[options.error]		Callback that will be called if conversion fails
 * @param 	{String} 	[options.shFile]	JSON file that contains additional shorthand notation to use during conversion
 */
STSS.prototype.render = function(options) {
	var success = options.success || function() {},
		logProcess = this.logProcess.bind(this),
		tss;

	try {
		options = parseOptions(options);
	} catch (err) {
		return options.error && options.error(err);
	}

	options.success = function(tss) {
		if (options.outFile) {
			fs.writeFile(options.outFile, tss, function(err) {
				if (err) { return options.error && options.error(err); }
				success(options.outFile);
			});
		} else {
			success(tss);
		}
 	};

 	if (options.data) {
		process(options.data, options, logProcess);

	} else if (options.file) {
		fs.exists(options.file, function() {
			fs.readFile(options.file, {encoding: 'utf8'}, function(err, data) {
				if (err) { return options.error && options.error(err); }
				process(data, options, logProcess);
			});
		});

	} else {
		return options.error && options.error('No input file or data supplied');
	}
};

/**
 * Render STSS to TSS using the supplied instructions.
 *
 * Either options.data or options.file need to be provided. If both are supplied, data takes precedence and file
 * will be ignored.
 * Likewise, either options.outFile or options.success should be defined, or both.
 *
 * This function executes synchronously.
 * 
 * @param 	{Object}	options				Dictionary containing instructions
 * @param 	{String} 	[options.data]		STSS data, required if options.file is not passed
 * @param 	{String} 	[options.file]		STSS file that is to be converted
 * @param 	{String} 	[options.outFile]	File that is created/overwritten with the generated TSS output
 * @param 	{Function} 	[options.success]	Callback that will be called upon successful conversion
 * @param  	{Function}	[options.error]		Callback that will be called if conversion fails
 * @param 	{String} 	[options.shFile]	JSON file that contains additional shorthands to use during conversion
 */
STSS.prototype.renderSync = function(options) {
	var success = options.success || function() {},
		logProcess = this.logProcess.bind(this),
		data, tss;

	try {
		options = parseOptions(options);
	} catch (err) {
		return options.error && options.error(err);
	}

	options.success = function(tss) {
		if (options.outFile) {
			try {
				fs.writeFileSync(options.outFile, tss);
			} catch (err) {
				return options.error && options.error(err);
			}
			success(options.outFile);
		} else {
			success(tss);
		}
 	};

 	if (options.data) {
		try {
			tss = processSync(options.data, options, logProcess);
		} catch (err) {
			return options.error && options.error(err);
		}
		options.success(tss);

	} else if (options.file) {
		if (fs.existsSync(options.file)) {
			try {
				data = fs.readFileSync(options.file, {encoding: 'utf8'});
			} catch (err) {
				return options.error && options.error(err);
			}
			try {
				tss = processSync(data, options, logProcess);
			} catch (err) {
				return options.error && options.error(err);
			}
			options.success(tss);
		} else {
			return options.error && options.error('Input file does not exist: '+options.file);
		}

	} else {
		return options.error && options.error('No input file or data supplied');
	}
};

/**
 * Log the conversion step that was just completed.
 * 
 * @param  {String} 	conversion 	Type of conversion just completed
 * @param  {String} 	output 		Output of the phase that was just finished
 * @fires conversionStep
 */
STSS.prototype.logProcess = function(conversion, output) {
	this.emit('conversionStep', conversion, output);
};

// Return the Singleton
module.exports = new STSS();
