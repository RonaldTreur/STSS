var fs = require('fs'),
	chalk = require('chalk'),
	stss2scss = require('./lib/renderer/stss2scss'),
	scss2css = require('./lib/renderer/scss2css'),
	css2json = require('./lib/renderer/css2json'),
	json2tss = require('./lib/renderer/json2tss');

/**
 * Convert the supplied SCSS structured markup into TSS.
 *
 * This function executes synchronously.
 *
 * @private
 * @param 	{String}	scss 		SCSS structured markup
 * @param 	{Object}	options		Dictionary containing instructions
 * @return 	{String} 				TSS structured markup
 */
function render(stss, options) {
	var scss = stss2scss(stss, options),
		css = scss2css(scss, options),
		json = css2json(css, options),
		tss = json2tss(json, options);

	return tss;
}

/**
 * Render STSS to TSS using the supplied instructions.
 *
 * Either options.data or options.file need to be provided. If both are supplied, data takes precedence and file
 * will be ignored.
 * 
 * @param 	{Object}	options			Dictionary containing instructions
 * @param 	{String} 	[options.data]	STSS data, required if options.file is not passed
 * @param 	{String} 	[options.file]	STSS file that is to be converted
 * @param 	{Function} 	options.success Callback that will be called upon successful conversion
 * @param  	{Function}	[options.error]	Callback that will be called if conversion fails
 */
module.exports = function(options) {
	var tss;

	if (options.data) {
		tss = render(options.data, options);
		options.success(tss);
	} else if (options.file) {
		fs.readFile(options.file, {encoding: 'utf8'}, function(err, data) {
			if (err) { return options.error && options.error(err); }
			try {
				tss = render(data, options);
			} catch (e) {
				return options.error && options.error(e);
			}
			options.success(tss);
		});
	} else {
		return options.error && options.error('No input file or data supplied');
	}
};
