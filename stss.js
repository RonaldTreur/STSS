var fs = require('fs'),
	chalk = require('chalk'),
	async = require('async'),
	stss2scss = require('./lib/renderer/stss2scss'),
	scss2css = require('./lib/renderer/scss2css'),
	css2json = require('./lib/renderer/css2json'),
	json2tss = require('./lib/renderer/json2tss');


/**
 * Convert the supplied SCSS structured markup into TSS.
 *
 * This function executes asynchronously.
 *
 * @private
 * @param 	{String}	scss 		SCSS structured markup
 * @param 	{Object}	options		Dictionary containing instructions
 * @param 	{Function} 	options.success 	Callback that will be called upon successful conversion
 * @param  	{Function}	[options.error]		Callback that will be called if conversion fails
 * @param 	{String} 	[options.shFile]	JSON file that contains additional shorthand notation to use during conversion
 */
function process(stss, options) {
	async.waterfall([
		function(callback) {
			var scss = stss2scss(stss, options);
			callback(null, scss);
		},
		function(scss, callback) {
			console.log(scss);
			var css = scss2css(scss, options);
			callback(null, css);
		},
		function(css, callback) {
			var json = css2json(css, options);
			callback(null, json);
		},
		function(json, callback) {
			var tss = json2tss(json, options);
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
 * @param 	{String}	scss 		SCSS structured markup
 * @param 	{Object}	options		Dictionary containing instructions
 * @param 	{Function} 	options.success 	Callback that will be called upon successful conversion
 * @param  	{Function}	[options.error]		Callback that will be called if conversion fails
 * @param 	{String} 	[options.shFile]	JSON file that contains additional shorthand notation to use during conversion
 * @return 	{String} 				TSS structured markup
 */
function processSync(stss, options) {
	var scss = stss2scss(stss, options),
		css = scss2css(scss, options),
		json = css2json(css, options),
		tss = json2tss(json, options);

	return tss;
}

exports.render = function(options) {
	var tss,
		success = options.success;

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
		tss = process(options.data, options, function(err, tss) {
			if (err) { return options.error && options.error(err); }
			options.success(tss);
		});

	} else if (options.file) {
		fs.exists(options.file, function() {
			fs.readFile(options.file, {encoding: 'utf8'}, function(err, data) {
				if (err) { return options.error && options.error(err); }
				process(data, options);
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
 * 
 * @param 	{Object}	options				Dictionary containing instructions
 * @param 	{String} 	[options.data]		STSS data, required if options.file is not passed
 * @param 	{String} 	[options.file]		STSS file that is to be converted
 * @param 	{Function} 	options.success 	Callback that will be called upon successful conversion
 * @param  	{Function}	[options.error]		Callback that will be called if conversion fails
 * @param 	{String} 	[options.shFile]	JSON file that contains additional shorthand notation to use during conversion
 */
exports.renderSync = function(options) {
	var tss,
		success = options.success,
		data;

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
			tss = processSync(options.data, options);
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
				tss = processSync(data, options);
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
