/**
 * Convertor for JSON structured markup to TSS formatted markup.
 *
 * @class 	renderer.json2scss
 * @author  ronaldtreur <ronald@lostparticle.net>
 */

var util = require('util'),
	reNewline = /\n|\r\n|\r|\f/,
	reWhitespace = /[\s\t]*/,
	reDeclJSON = function(name) {
		return new RegExp("(([\"'])"+name+"\\2): ([\"'])([^"+reNewline.source+"]+)\\3");
	},
	rePropName = /(([\"'])([\w-]+)\2):/g,
	reLocaleString = /L\(\\["'](.*?)\\["']\)/gi;


/**
 * Process an array-value.
 *
 * This method invokes processRule (and is itself invoked by processRule),
 *
 * @private
 * @param  {Array} value	Array value
 * @return {String}       	Processed value
 */
function processArrayValue(value, level) {
	var newValue = [];

	value.forEach(function(v) {
		v = processRule(v, level + 1);
		newValue.push(v);
	});

	return '[' + newValue.join(',') + ']';
}

/**
 * Process an object-value.
 *
 * This method invokes processRule (and is itself invoked by processRule),
 *
 * @private
 * @param  {Object} value	Object value
 * @param  {Object} rule 	Rule definition (containing the value)
 * @return {String}       	Processed value
 */
function processObjectValue(value, rule, level) {
	if (value.body) {
		value = processRule(value, level + 1);
	} else {
		value = processRule({
			body: value,
			unquote: rule.unquote
		}, level + 1);
	}

	return value;
}

/**
 * Process the rule (unquote if required).
 *
 * Note: This is a recursive method (through `processArrayValue` and `processObjectValue`!
 * Whenever an object/array-value is encountered, this method is re-invoked on that value.
 *
 * @private
 * @param  {Object} rule Rule definition
 * @return {String}      JSON String to concatenate to the resulting TSS
 */
function processRule(rule, level) {
	var isObject = false,
		specialValues = {},
		placeholderPrefix = '-stss-ph',
		phIndex = 0,
		prettyTabs = '',
		body, ph, name, value;

	if (rule.comment) {
		return '';
	} else if (!rule.selector) {
		isObject = true;
	}

	body = rule.body || {};

	// Level is purely used for "prettification"
	if (level === undefined) {
		// The first call, still on root-level
		level = 0;
	} else {
		// Add a tab per level
		for (; prettyTabs.length < level;) {
			prettyTabs += '\t';
		}
	}

	for (name in body) {
		value = body[name];

		// Value if an array
		if (util.isArray(value)) {
			phIndex++;
			ph = placeholderPrefix + phIndex;
			specialValues[ph] = processArrayValue(value, level);
			body[name] = ph;

		// Value is an object
		} else if (typeof value === 'object') {
			phIndex++;
			ph = placeholderPrefix + phIndex;
			specialValues[ph] = processObjectValue(value, rule, level);
			body[name] = ph;
		}
	}

	if (rule.selector === '-stss-value') {
		body = rule.unquote ? rule.value : '"' + rule.value + '"';
		return body;
	}

	body = JSON.stringify(body, null, (prettyTabs + '\t'));
	if (isObject) {
		body = body.substr(0, body.length - 1) + prettyTabs + '}';
	}

	for (ph in specialValues) {
		value = specialValues[ph];
		body = body.replace('"' + ph + '"', value);
	}

	if (rule.unquote) {
		rule.unquote.forEach(function(name) {
			body = body.replace(reDeclJSON(name), "$1: $4");
		});
	}

	// Unquote names (TODO: should be option?)
	body = body.replace(rePropName, "$3:");

	// Remove any duplicate backslashes
	body = body.replace(/\\\\/g, "\\");

	// Remove backslashes in Locales
	body = body.replace(reLocaleString, "L(\"$1\")");

	if (rule.selector) {
		// Root selectors
		return '"' + rule.selector + '"' + ": " + body + ",\n"; //prettify option
	} else {
		// Property objects
		return body;
	}
}

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
		tss += processRule(rule);
	});

	tss = tss.replace(/,\n$/, "");

	return tss;
};
