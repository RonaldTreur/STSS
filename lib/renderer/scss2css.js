/**
 * Convertor for SCSS structured markup to CSS markup.
 *
 * This utilizes the libsass library, made available via the node-sass project.
 * 
 * @class 	renderer.scss2css
 * @author  ronaldtreur <ronald@lostparticle.net>
 */

var sass = require('node-sass'),
	stats = {};

/**
 * Convert the supplied SCSS structured markup into CSS.
 *
 * This function executes synchronously.
 * 
 * @param 	{String}	scss 		SCSS structured markup
 * @param 	{Object}	options		Dictionary containing addition instructions
 * @return 	{String}				CSS structured markup
 */
module.exports = function(scss, options) {
	return sass.renderSync({
		data: scss,
		options: {stats: stats}
	});
};