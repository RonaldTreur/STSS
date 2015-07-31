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
 * @private
 * @param  {Object} options Dictionary containing additional instructions
 */
function loadShorthand(options) {
	// Make sure shorthand exists and contains the proper sub-structures
	shorthand || (shorthand = {});
	shorthand.queries || (shorthand.queries = {});
	shorthand.queryValues || (shorthand.queryValues = {});
	shorthand.propertyValues || (shorthand.propertyValues = {});
	shorthand.propertyNames || (shorthand.propertyNames = {});

	// Make sure customShorthand exists and contains the proper sub-structures
	customShorthand  = options.shorthand || (customShorthand = {});
	customShorthand.queries || (customShorthand.queries = {});
	customShorthand.queryValues || (customShorthand.queryValues = {});
	customShorthand.propertyValues || (customShorthand.propertyValues = {});
	customShorthand.propertyNames || (customShorthand.propertyNames = {});
}

/**
 * Expand the property name if it is a shorthand notation.
 *
 * @private
 * @param  {String} parent	Parent of the property
 * @param  {String} name	Name of the property
 * @return {String}			Optionally expanded name
 */
function expandName(parent, name) {
	return (shorthand.propertyNames[parent] && shorthand.propertyNames[parent][name]) ||
			(shorthand.propertyNames[parent] && shorthand.propertyNames[parent][name]) ||
			name;
}

/**
 * Expand the property's value if it is a shorthand notation.
 *
 * @private
 * @param  {String}	name	Name of the property
 * @param  {String}	value	Value of the property
 * @return {String}			Optionally expanded value
 */
function expandValue(name, value) {
	return (customShorthand.propertyValues[name] && customShorthand.propertyValues[name][value]) || 
			(shorthand.propertyValues[name] && shorthand.propertyValues[name][value]) ||
			value;
}

/**
 * Expand the query if it is a shorthand notation.
 *
 * @private
 * @param  {String} query	Query
 * @return {String}			Optionally expanded query
 */
function expandQuery(query) {
	return customShorthand.queries[query] || shorthand.queries[query] || query;
}

/**
 * Expand the query's value if it is a shorthand notation.
 *
 * @private
 * @param  {String} value	Query value
 * @return {String}			Optionally expanded query value
 */
function expandQueryValue(value) {
	return customShorthand.queryValues[value] || shorthand.queryValues[value] || value;
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
 * Parse a single special (declaration) value using the special instructions.
 *
 * @private
 * @param {String} value	Value containing special construct
 * @param {Object} special	Special STSS rules parsed from the CSS
 */
function parseSpecialValue(value, special) {
	var matches = /--stss-([a-z]+)/.exec(value),
		type = matches[1], 
		arrayNr, valueString, values, v;
	
	if (type === 'array') {
		matches = /--stss-array(\d+)\(([\w -]+)\)/.exec(value);
		arrayNr = matches[1],
		valueString = matches[2],
		values = [];

		valueString.replace(/stss-array(\d+)-(val|obj)(\d+)/g, function(m, aNr, valueType, valueNr) {
			// TODO? Sanity check aNr === arrayNr
			v = special['array'][arrayNr][valueNr][0];

			if (valueType === 'val') {
				values.push({
					selector: '-stss-value',
					value: v.body.text,
					unquote: v.unquote && v.unquote.length && v.unquote[0] === 'text'
				});
			} else {
				values.push({
					body: v.body,
					unquote: v.unquote
				});
			}
		});
		return values;
	}

	return value;
}

/**
 * Parse a single declaration into something TSS would understand.
 *
 * @private
 * @param  {String} decl 	Declaration
 * @param  {Object} output 	Dictionary the result will be added to
 * @param  {Object} special	Special STSS rules parsed from the CSS
 * @return {String}       	The proporty's name if this declaration's value needs to be unquoted in TSS, null otherwise
 */
function parseDeclaration(decl, output, special) {
	var prop = decl.property,
		value = decl.value,
		unquote = false,
		parent,
		newValue,
		matches;

	while (/\w+[-][\w]/.test(prop)) {
		// Split property name in two and nest them
		matches = /^(\w+)[-]([\w-]+)$/.exec(prop);
		prop = matches[1];
		output[prop] || (output[prop] = {});
		output = output[prop];
		parent = prop;
		prop = matches[2];
		
		// If the name is shortened (nested only): Expand it
		prop = expandName(parent, prop);
	}

	// If value is a special STSS reference: Process this now
	if (/^--sts/.test(value)) {
		value = parseSpecialValue(value, special);

	// If value is a fully numeric string: Convert to number
	} else if (value - parseFloat(value) >= 0) {
		if (/\./.test(value)) {
			value = parseFloat(value);
		} else {
			value = parseInt(value, 10);
		}

	// If value is a boolean string: Unquote it
	} else if (/true|false/i.test(value)) {
		unquote = true;

	// If value is a Ti or Alloy structure: Unquote it
	// } else if (/(?:ti[.])|(?:titanium[.])|(?:alloy[.])/i.test(value)) {
	// 	value = value.replace(/^["']+(.+?)["']+/, "$1");
	// 	unquote = true;

	// If value is an i8N command: Unquote it
	} else if (/^L\(['"][^)]+['"]\)/i.test(value)) {
		unquote = true;

	// If the value is shortened: Expand it
	} else if ((newValue = expandValue(prop, value)) && newValue !== value) {
		value = newValue;
		unquote = true; // shorthand is currently only applicable on Ti & Alloy structures

	} else {
		// Unquote (non-numeric) values that contain no whitespaces, but do contain dots (probably Ti & Alloy structures)
		value = value.replace(/^(["'])(\w+(?=\.)[\w.]+)\1$/g, function(match, quote, val) {
			// If value is a numeric (dp/percentage) string
			// or if it is an Android Theme, ignore
			if (/^\d+?\.?\d+(dp|%)?$/.test(val) || /^Theme\..*/.test(val)) {
				return match;
			} else {
				unquote = true;
				return val;
			}
		});
	
		// Unquote doubly-quoted value's
		value = value.replace(/^(["'])(.*?)\1$/, "$2");
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
		query = expandQuery(query);
	} else {
		// Unquote quoted query values
		if (/\"|'/.test(query)) {
			query = query.replace(/(["'])([\w.]+)\1/g, function(match, quote, value) {
				return value;
			});
		}
		
		// Expand value if a shorthand value is used
		query = query.replace(/=([\w.]+)/g, function(match, value) {
			return '=' + expandQueryValue(value);
		});
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
 * @param  {Object} special	Special STSS rules parsed from the CSS
 */
function parseMediaRule(rule, output, special) {
	// Note: This method is invoked by parseAST, and itself executes parseAST as well.
	// If the CSS is valid, then the recursion is only one level deep. Media queries can't
	// contain nested queries and normal rules can't contain any other rules.
	var mediaOutput = parseAST(rule.rules, special),
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
 * @param  {Object} special	Special STSS rules parsed from the CSS
 */
function parseNormalRule(rule, output, special) {
	var body = {},
		unquote = [],
		dupe = rule.selectors.length > 1;

	rule.declarations.forEach(function(decl) {
		if (decl.type !== "declaration") {
			return;
		}

		var prop = parseDeclaration(decl, body, special);
		if (prop) {
			unquote.push(prop);
		}
	});

	rule.selectors.forEach(function(selector) {
		var parsed = {
			selector: parseSelector(selector),
			body: dupe ? clone(body) : body
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
 * Retrieve the temporary rules from the CSS.
 * 
 * Parses and removes the temporary rules and returns them, so
 * they can be re-inserted at their original locations.
 *
 * @private
 * @param  {Object} rules 	CSS rules (JSONified)
 * @return {Object} 		Special STSS rules parsed from the CSS
 */
function parseSpecial(rules) {
	var special = {},
		rule, matches, i, s;

	for (i = rules.length-1; i > -1; i--) {
		rule = rules[i];
		if (rule.type === "rule" &&
			rule.selectors &&
			rule.selectors.length &&
			/^-stss/.test(rule.selectors[0])
		) {
			matches = /-stss-([a-z]+)(\d+)-(?:val|obj)(\d+)/.exec(rule.selectors[0]);
			s = special[matches[1]] || (special[matches[1]] = {});
			s = s[matches[2]] || (s[matches[2]] = {});
			s = s[matches[3]] = [];

			parseNormalRule(rule, s, special);
			delete rules[i];
		}
	}

	return special;
}

/**
 * Parses the JSONified CSS rules.
 *
 * @private
 * @param  {Object} rules 	CSS rules (JSONified)
 * @param  {Object} special	Special STSS rules parsed from the CSS
 * @return {Object}       	Altered JSON that looks a lot more like TSS
 */
function parseAST(rules, special) {
	var output = [];
	
	rules.forEach(function(rule) {
		if (rule.type === "rule") {
			parseNormalRule(rule, output, special);
		} else if (rule.type === "media") {
			parseMediaRule(rule, output, special);
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
		json = {},
		special;

	if (!ast || !ast.stylesheet || !ast.stylesheet.rules) {
		throw new Error('Parsing CSS failed');
	}

	// Uncomment the line below to see the intermediate JSON (AST) as created by the CSS parser
	//console.log(JSON.stringify(ast, null, 2));

	loadShorthand(options);

	special = parseSpecial(ast.stylesheet.rules);
	json = parseAST(ast.stylesheet.rules, special);

	return json;
};

/**
 * Quick (and dirty) workaround to create deep copies of objects.
 *
 * @private
 * @param  {Object} obj The original object
 * @return {Object} A deep copy of obj
 */
function clone(obj) {
	return JSON.parse(JSON.stringify(obj));
}
