/**
 * Convertor for CSS structured markup into JSON (AST).
 *
 * @class 	renderer.css2json
 * @author  ronaldtreur <ronald@lostparticle.net>
 */

var parseCSS = require('css-parse'),
	fs = require('fs'),
	shorthand = require('../../shorthand.json'),
	customShorthand;
	
/**
 * Load shorthand instruction from disk.
 * 
 * @param  {Object} options Dictionary containing additional instructions
 */
function loadShorthand(options) {
	// Make sure shorthand exists and contains the proper sub-structures
	shorthand || (shorthand = {});
	shorthand.queries || (shorthand.queries = {});
	shorthand.propertyValues || (shorthand.propertyValues = {});
	shorthand.propertyNames || (shorthand.propertyNames = {});

	// Make sure userShorthand exists and contains the proper sub-structures
	customShorthand  = options.shorthand || (customShorthand = {});
	customShorthand.queries || (customShorthand.queries = {});
	customShorthand.propertyValues || (customShorthand.propertyValues = {});
	customShorthand.propertyNames || (customShorthand.propertyNames = {});
}

/**
 * Expand if this is a shorthand notation.
 * 
 * @param  {String}  parent		Parent of the property
 * @param  {String}  name		Name of the property
 * @return {String|Boolean}		Expanded name or false
 */
function expandName(parent, name) {
	return (shorthand.propertyNames[parent] && shorthand.propertyNames[parent][name]) ||
		(shorthand.propertyNames[parent] && shorthand.propertyNames[parent][name]);
}

/**
 * Expand if this is a shorthand notation.
 * 
 * @param  {String}  name	Name of the property
 * @param  {String}  value	Value of the property
 * @return {String|Boolean}	Expanded value or false
 */
function expandValue(name, value) {
	return (customShorthand.propertyValues[name] && customShorthand.propertyValues[name][value]) || 
			(shorthand.propertyValues[name] && shorthand.propertyValues[name][value]);
}

/**
 * Parse a single selector into a form TSS likes.
 *
 * This function's primary goal is to make sure mutliple queries embedded into the selector
 * are converted to TSS-like syntax.
 *
 * @private
 * @param  {String}	selector	Selector
 * @return {String}				Parsed selector
 */
function parseSelector(selector) {
	var parsed;

	parsed = selector.replace(/\[([^\]]+)\]/g, function(match, p1) {
		var queryParts = p1.split(' '),
			parts = [];

		queryParts.forEach(function(query) {
			parts.push(parseMediaQuery(query));
		});

		return '[' + parts.join(' ') + ']';
	});
	
	parsed = parsed.replace(/\]\[/g, ' ');

	return parsed;
}

/**
 * Parse a single declaration into something TSS would understand.
 *
 * @private
 * @param  {String} decl 	Declaration
 * @param  {Object} output 	Dictionary the result will be added to
 * @return {String}       	The proporty's name if this declaration's value needs to be unquoted in TSS, null otherwise
 */
function parseDeclaration(decl, output) {
	var prop = decl.property,
		value = decl.value,
		unquote = false,
		parent = false,
		expanded,
		matches;

	if (/\w+[-]\w+/.test(prop)) {
		// Split property name in two and nest them
		matches = /(\w+)[-](\w+)/.exec(prop);
		prop = matches[1];
		output[prop] || (output[prop] = {});
		output = output[prop];
		parent = prop;
		prop = matches[2];
	}

	// If the name is shortened (nested only): Expand it
	if (expanded = parent && expandName(parent, prop)) {
		prop = expanded;
	}

	// If value is a fully numeric string: Convert to numeric values
	if (!isNaN(value)) {
		value = parseInt(value, 10);

	// If value is a boolean string: Unquote it
	} else if (/true|false/i.test(value)) {
		unquote = true;

	// If value is a Ti or Alloy structure: Unquote it
	} else if (/(?:ti[.])|(?:titanium[.])|(?:alloy[.])/i.test(value)) {
		value = value.replace(/^["']+(.+?)["']+/, "$1");
		unquote = true;

	// If the value is shortened: Expand it
	} else if (expanded = expandValue(prop, value)) {
		value = expanded;
		unquote = true; // shorthand is currently only applicable on Ti & Alloy structures

	// Unquote quoted value's
	} else {
		value = value.replace(/^["']+(.+?)["']+/, "$1");
	}
	
	output[prop] = value;
	return unquote ? prop : null;
}

/**
 * Parse a single Media query into something TSS would understand.
 *
 * @private
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
 * @private
 * @param  {Object} rule 	CSS rule (AST)
 * @param  {Object} output	Dictionary the result will be added to
 */
function parseMediaRule(rule, output) {
	// Note: This method is invoked by parseAST, and itself executed parseAST as well.
	// If the CSS is valid, then the recursion is only one level deep. Media queries can't
	// contain nested queries and normal rules can't contain any other rules.
	var mediaOutput = parseAST(rule.rules),
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
 * @private
 * @param  {Object} rule 	CSS rule (AST)
 * @param  {Object} output	The output will be added to this dictionary 
 */
function parseNormalRule(rule, output) {
	var body = {},
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

	rule.selectors.forEach(function(selector) {
		var parsed = {
			selector: parseSelector(selector),
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
 * @private
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
 * @private
 * @param  {Object} rules CSS rules (JSONified)
 * @return {Object}       Altered JSON that looks a lot more like TSS
 */
function parseAST(rules) {
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
 * Convert the supplied CSS structured markup into JSON.
 *
 * This function executes synchronously.
 *
 * @constructor
 * @param 	{String}	css 		CSS structured markup
 * @param 	{Object}	options		Dictionary containing additional instructions
 * @return 	{Object}				JSON structured markup
 */
module.exports = function(css, options) {
	var ast = parseCSS(css),
		json = {};

	if (!ast || !ast.stylesheet || !ast.stylesheet.rules) {
		throw new Error('Parsing CSS failed');
	}

	loadShorthand(options);

	json = parseAST(ast.stylesheet.rules, json);

	return json;
};