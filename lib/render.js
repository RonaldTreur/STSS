var fs = require('fs'),
	sass = require('node-sass'),
	parseCss = require('css-parse'),
	chalk = require('chalk'),
	shorthand = require('../shorthand.json'),
	stats = {};

var reNewline = /\n|\r\n|\r|\f/,
	reWhitespace = /[\s\t]*/,
	reDeclCSS = new RegExp("([-\\w]+)"+reWhitespace.source+":"+reWhitespace.source+"([^("+reNewline.source+")]+)", "g"),
	reDeclJSON = function(name) {
		return new RegExp("([\"']"+name+"[\"'])"+reWhitespace.source+":"+reWhitespace.source+"[\"']([^("+reNewline.source+")]+)[\"']");
	};


// Make sure shorthand exists and contains the proper sub-structures
shorthand || (shorthand = {});
shorthand.queries || (shorthand.queries = {});
shorthand.declarations || (shorthand.declarations = {});


/**
 * Convert the STSS to SCSS.
 * 
 * @param  {String} stss STSS
 * @return {String}      SCSS
 */
function stss2scss(stss) {
	stss = stss.replace(reDeclCSS, function(match, p1, p2) {
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

	return stss;
}

/**
 * Convert the SCSS to CSS.
 * 
 * @param  {String} scss SCSS
 * @return {String}      CSS
 */
function scss2css(scss) {
	return sass.renderSync({
		data: scss,
		options: {stats: stats}
	});
}

/**
 * Parse a single declaration into something TSS would understand.
 * 
 * @param  {String} decl 	Declaration
 * @param  {Object} output 	Dictionary the result will be added to
 * @return {String}       	THe proporty's name if this declaration's value needs to be unquoted in TSS, null otherwise
 */
function parseDeclaration(decl, output) {
	var prop = decl.property,
		value = decl.value,
		unquote = false,
		matches;

	if (/\w+[-]\w+/.test(prop)) {
		// Split property name in twos
		matches = /(\w+)[-](\w+)/.exec(prop);
		prop = matches[1];
		output[prop] || (output[prop] = {});
		output = output[prop];
		prop = matches[2];
	}

	// If value is fully numeric string: Convert to numeric values
	if (!isNaN(value)) {
		value = parseInt(value, 10);

	// If value is a Ti or Alloy structure: Unquote it
	} else if (value.search(/(?:ti[.])|(?:titanium[.])|(?:alloy[.])/i) !== -1) {
		value = value.replace(/^["']+(.+?)["']+/, "$1");
		unquote = true;

	// If the value is shortened: Expand it
	} else if (shorthand.declarations[prop] && shorthand.declarations[prop][value]) {
		value = shorthand.declarations[prop][value];
		unquote = true; // shorthand is only applicable on Ti & Alloy structures
	}
	
	output[prop] = value;
	return unquote ? prop : null;
}

/**
 * Parse a single Media query into something TSS would understand.
 * 
 * @param  {String} query Media query
 * @return {String}       Possibly transformed query
 */
function parseMediaQuery(query) {
	// Remove parenthesis
	query = query.replace(/^\(([^)]+)\)/, "$1");
	// Convert ':' to '='
	query = query.replace(/\s*:\s*/, "=");

	// Expand if a shorthand form is used
	if (!(/=/.test(query))) {
		query = shorthand.queries[query] ? shorthand.queries[query] : query;
	}

	return query;
}

/**
 * Parse a CSS media query.
 *
 * # Logical operators
 * Only *comma separated lists* and `and` are allowed in between each two successive query-parts.
 * Operators `not` and `only` are currently not supported.
 *
 * @param  {Object} rule 	CSS rule (AST)
 * @param  {Object} output	Dictionary the result will be added to
 */
function parseMediaRule(rule, output) {
	// Note: This method is invoked by parseRules, and itself executed parseRules as well.
	// If the CSS is valid, then the recursion is only one level deep. Media queries can't
	// contain nested queries and normal rules can't contain any other rules.
	var mediaOutput = parseRules(rule.rules),
		orParts = rule.media.split(/\s*,\s*/), 
		queries = [];

	// Iterate over comma-separated query parts
	orParts.forEach(function(query) {
		var andParts  = query.split(/\s+and\s+/),
			queryParts = [];

		// Iterate over and-separated query parts
		andParts.forEach(function(query) {
			queryParts.push(parseMediaQuery(query));
		});

		queries.push("[" + queryParts.join(" ") + "]");
	});

	mediaOutput.forEach(function(mediaRule) {
		var selector = mediaRule.selector,
			body = mediaRule.body;

		if (selector) {
			queries.forEach(function(query) {
				var parsed = {
					selector: selector+query,
					body: body
				};
				mediaRule.unquote && (parsed.unquote = mediaRule.unquote);
				output.push(parsed);
			});
		}
	});
}

/**
 * Parse a 'regular' CSS rule.
 * 
 * @param  {Object} rule 	CSS rule (AST)
 * @param  {Object} output	The output will be added to this dictionary 
 */
function parseNormalRule(rule, output) {
	var selectors = rule.selectors,
		body = {},
		unquote = [];

	rule.declarations.forEach(function(decl) {
		if (decl.type !== "declaration") {
			return;
		}

		var prop = parseDeclaration(decl, body);
		if (prop) {
			unquote.push(prop);
		}
	});

	selectors.forEach(function(selector) {
		var parsed = {
			selector: selector,
			body: body
		};
		unquote.length && (parsed.unquote = unquote);
		output.push(parsed);
	});
}

/**
 * Parse a multiline CSS comment.
 *
 * Note that single-line comments will be stripped durig scss -> css conversion.
 * 
 * @param  {Object} rule 	CSS rule (AST)
 * @param  {Object} output	The output will be added to this dictionary 
 */
function parseCommentRule(rule, output) {
	output.push({
		comment: true,
		body: "\\*" + rule.comment + "*\\"
	});
}

/**
 * Parses the JSONified CSS rules.
 * 
 * @param  {Object} rules CSS rules (JSONified)
 * @return {Object}       Altered JSON that looks a lot more like TSS
 */
function parseRules(rules) {
	var output = [];

	rules.forEach(function(rule) {
		if (rule.type === "rule") {
			parseNormalRule(rule, output);
		} else if (rule.type === "media") {
			parseMediaRule(rule, output);
		} else if (rule.type === "comment") {
			parseCommentRule(rule, output);
		}
	});

	return output;
}


/**
 * Convert the CSS to (TSS-ish) JSON.
 * 
 * @param  {String} css CSS
 * @return {Object}     JSON resembling TSS
 */
function css2json(css) {
	var parsed = parseCss(css),
		json = {},
		rules;

	if (!parsed || !parsed.stylesheet || !parsed.stylesheet.rules) {
		throw {error: true};
	}

	rules = parsed.stylesheet.rules;

	console.log(JSON.stringify(rules, null, 2));

	json = parseRules(rules, json);

	return json;
}

/**
 * Convert the JSON to TSS.
 * 
 * @param  {Object} json JSON resembling TSS
 * @return {String}      TSS
 */
function json2tss(json) {
	var tss = "";

	json.forEach(function(rule) {
		if (rule.selector) {
			var body = JSON.stringify(rule.body, null, 4);

			if (rule.unquote) {
				rule.unquote.forEach(function(name) {
					body = body.replace(reDeclJSON(name), "$1: $2");
				});

			}
			tss += '"' + rule.selector + '"' + ": " + body + ",\n"; //prettify option
		}
	});
	tss = tss.replace(/,\n$/, "");

	return tss;
}

/**
 * Convert the supplied STSS data into TSS data.
 * 
 * @param  {String} stss STSS
 * @return {String}      TSS
 */
function renderData(stss) {
	var scss = stss2scss(stss),
		css = scss2css(scss),
		json = css2json(css),
		tss = json2tss(json);

	// console.log("> SCSS:\n");
	// console.log(scss);
	// console.log("> CSS:\n");
	// console.log(css);
	// console.log("> JSON:\n");
	// console.log(JSON.stringify(json, null, 2));
	// console.log("> TSS:\n");
	// console.log(tss);

	return tss;
}

/**
 * Render a STSS file to TSS.
 * 
 * @param  {Object}   options Dictionary containing settings and directives for this process
 * @param  {Function} cb      Callback function to be called with the result
 */
function render(options, cb) {
	fs.readFile(options.inFile, {encoding: 'utf8'}, function (err, data) {
		if (err) {
			cb(err);
			return;
		}

  		cb(null, renderData(data, options));
	});
}

/**
 * Write data to a file.
 * 
 * @param  {String} file Filename
 * @param  {String} data Data
 */
function writeFile(file, data) {
	fs.writeFile(file, data, function (err) {
		if (err) {
			throw err;
		}
	});
}


module.exports = function(options, emitter) {
	options.emitter = emitter;

	render(options, function(err, tss) {
		if (!err) {
			writeFile(options.outFile, tss);
			console.log(chalk.green('TSS successfully generated to '+ options.outFile));
		}
	});
};
