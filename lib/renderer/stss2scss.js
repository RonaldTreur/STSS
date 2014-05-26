/**
 * Convertor for STSS structured markup into SCSS.
 *
 * @class 	renderer.stss2scss
 * @author  ronaldtreur <ronald@lostparticle.net>
 */

var reNewline = /\n|\r\n|\r|\f/,
	reWhitespaceOpt = /[\s\t]*/,
	reWhitespace = /[\s\t]+/,
	reDeclCSS = new RegExp("([-\\w]+)"+reWhitespaceOpt.source+":"+reWhitespaceOpt.source+"([^("+reNewline.source+")]+)", "g");

/**
 * Convert the supplied STSS structured markup into SCSS.
 *
 * This function executes synchronously.
 *
 * @constructor
 * @param 	{String}	stss 		STSS structured markup
 * @param 	{Object}	options		Dictionary containing additional instructions
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

	// Convert TSS-style queries to something SCSS allows
	scss = scss.replace(/([\w\#.]+)(\[[^{]+)/g, function(match, p1, p2) {
		var queryParts = [],
			queries = p2.match(/\[[^\]]+\]/g);

		queries.forEach(function(query) {
			while (reWhitespace.test(query)) {
				query = query.replace(reWhitespace, '][');
			}
			queryParts.push(query);
		});

		return p1 + queryParts.join('');
	});

	return scss;
};