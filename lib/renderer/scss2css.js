/**
 * Convertor for SCSS structured markup to CSS markup.
 *
 * This utilizes the libsass library, made available via the node-sass project.
 * 
 * @class 	renderer.scss2css
 * @author  ronaldtreur <ronald@lostparticle.net>
 */

var sass = require('node-sass');

/**
 * Convert the supplied SCSS structured markup into CSS.
 *
 * This function executes synchronously.
 *
 * @constructor
 * @param 	{String}	scss 		SCSS structured markup
 * @param 	{Object}	options		Dictionary containing additional instructions
 * @return 	{String}				CSS structured markup
 */
module.exports = function(scss, options) {
	options.stats = {};
	
	return sass.renderSync({
		data: scss,
		stats: options.stats,
		include_paths: options.includePaths
	});
};