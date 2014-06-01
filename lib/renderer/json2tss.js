/**
 * Convertor for JSON structured markup to TSS formatted markup.
 * 
 * @class 	renderer.json2scss
 * @author  ronaldtreur <ronald@lostparticle.net>
 */

var reNewline = /\n|\r\n|\r|\f/,
	reWhitespace = /[\s\t]*/,
	reDeclJSON = function(name) {
		return new RegExp("(([\"'])"+name+"\\2)"+reWhitespace.source+":"+reWhitespace.source+"([\"'])([^"+reNewline.source+"]+)\\3");
	};

/**
 * Convert the supplied JSON structured markup into TSS.
 *
 * This function executes synchronously.
 * 
 * @param 	{Object}	json 		JSON structured markup
 * @param 	{Object}	options		Dictionary containing additional instructions
 * @return 	{String}				TSS structured markup
 */
module.exports = function(json, options) {
	var tss = "";

	json.forEach(function(rule) {
		if (rule.selector) {
			var body = JSON.stringify(rule.body, null, '\t');

			if (rule.unquote) {
				rule.unquote.forEach(function(name) {
					body = body.replace(reDeclJSON(name), "$1: $4");
					console.log('Unquoted: '+ body);
				});

			}
			tss += '"' + rule.selector + '"' + ": " + body + ",\n"; //prettify option
		}
	});
	tss = tss.replace(/,\n$/, "");

	return tss;
};