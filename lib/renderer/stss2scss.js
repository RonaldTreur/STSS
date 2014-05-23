/**
 * Convertor for STSS structured markup into SCSS.
 *
 * @class 	renderer.stss2scss
 * @author  ronaldtreur <ronald@lostparticle.net>
 */

var reNewline = /\n|\r\n|\r|\f/,
	reWhitespace = /[\s\t]*/,
	reDeclCSS = new RegExp("([-\\w]+)"+reWhitespace.source+":"+reWhitespace.source+"([^("+reNewline.source+")]+)", "g");

/**
 * Convert the supplied STSS structured markup into SCSS.
 *
 * This function executes synchronously.
 * 
 * @param 	{String}	stss 		STSS structured markup
 * @param 	{Object}	options		Dictionary containing addition instructions
 * @return 	{String}				SCSS structured markup
 */
module.exports = function(stss, options) {
	var scss = stss.replace(reDeclCSS, function(match, p1, p2) {
		// Replace hyphenated terms with camelCased variants
		if (p1.search(/[-]/) !== -1) {
			p1 = p1.replace(/[-]([a-z])/, function(pm, pp1) {
				return pp1.toUpperCase();
			});
		}

		// Wrap Ti & Alloy structures in quotes (if they weren't already)
		if (p2.search(/^(?:ti[.])|(?:titanium[.])|(?:alloy[.])/i) !== -1) {
			p2 = p2.replace(/(?:(?:ti)|(?:titanium)|(?:alloy))[.\w]+/i, function(pm) {
				return '"' + pm + '"';
			});
		}

		return p1+" : "+p2;
	});

	return scss;
};