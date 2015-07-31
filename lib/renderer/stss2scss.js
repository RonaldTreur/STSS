/**
 * Convertor for STSS structured markup into SCSS.
 *
 * @class 	renderer.stss2scss
 * @author  ronaldtreur <ronald@lostparticle.net>
 */
var fs = require('fs'),
	path = require('path');

var reNewline = /\n|\r\n|\r|\f/,
	reWhitespaceOpt = /[\s\t]*/,
	reWhitespace = /[\s\t]+/,
	reDeclCSS = new RegExp("([-\\w]+)"+reWhitespaceOpt.source+":"+reWhitespaceOpt.source+"([^("+reNewline.source+")]+)", "g"),
	reDeclArray = new RegExp("([-\\w]+)"+reWhitespaceOpt.source+":"+reWhitespaceOpt.source+"\\[([^\\]]+)\\]", "g"),
	reImports = /@import[\s\t]+([^;]+?);?$/gm,
	reImport = /(["'])(.+?)\1/g;

/**
 * Include all @imported STSS files.
 * 
 * Replaces all `@import <file.stss> [, <file1.stss>]` statements by the content of those files.
 * 
 * @param 	{String}	stss 					STSS structured markup
 * @param 	{Object}	options					Dictionary containing additional instructions
 * @param 	{String}	[options.file]			Filename of the STSS file currently being parsed
 * @param 	{String}	[options.includePaths]	Locations to look for imported files
 * @return 	{String}							STSS structured markup
 * @throws	{Error}								If importing a file fails
 */
function includeImports(stss, options) {
	var stssDir;

	if (options.file) {
		stssDir = (options.file.charAt(0) === '/') ? path.dirname(options.file) : path.dirname(path.join(process.cwd(), options.file));
	} else {
		stssDir = process.cwd();
	}

	stss = stss.replace(reImports, function(match, imports) {
		var imported = '';

		imports = imports.replace(reImport, function(m, quotes, filename) {
			var extension = path.extname(filename).toLowerCase(),
				i = 0,
				file, test, importPaths, content;

			// Only import STSS files (assuming no extension is regarded STSS as well)
			if (extension !== '' && extension !== '.stss') {
				return;
			}

			importPaths = options.includePaths ? options.includePaths.slice() : [];
			importPaths.unshift(stssDir);

			while (!file && i < importPaths.length) {
				test = path.join(importPaths[i], filename);

				if (fs.existsSync(test)) {
					file = test;
					break;
				}
				i++;
			}
			if (!file) {
				throw parseError('STSS file to import not found or unreadable: "' + filename + '"', match, stss, options);
			}
			
			content = includeImports(fs.readFileSync(file, 'utf-8'), {
				includePaths: importPaths,
				file: filename
			});

			imported += content + "\n";
		
			return content;
		});
		return imported;
	});
	return stss;
}

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
module.exports = function (stss, options) {
	var arrayIdx = 0,
		arrayDecl = [],
		scss;

	// Resolve all @import-statements recursively
	try {
		stss = includeImports(stss, options);
	} catch (err) {
		return err;
	}
	
	// Replace hyphenated terms with camelCased variants
	scss = stss.replace(reDeclCSS, function(match, key, value) {
		if (key.search(/-/) !== -1) {
			key = key.replace(/-([a-z])/g, function(pm, letter) {
				return letter.toUpperCase();
			});
		}

		return key + ": " + value;
	});

	// Convert TSS-style queries to something SCSS allows
	scss = scss.replace(/([\#.]?[\w]+)(\[[^{,]+)/g, function(match, p1, p2) {
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

	// Wrap any (non-numeric, non-string) term using dots into quotes
	// Info: The prefix part represents everything that could possibly precede a value
	scss = scss.replace(/([:=,\[]\s*)(["']?)([\w_\/\\]+(?=\.)[\w_.]+)\2/g, function(match, prefix, quoted, value) {
		// If value is a fully numeric (dp/percentage) string, ignore
		if (/^\d+?\.?\d+(dp|%)?$/.test(value)) {
			return match;
		}

		// If already quoted, ignore
		if (!quoted) {
			return prefix + '"' + value + '"';
		}
		return match;
	});

	// Add quotes (if not present) around hexadecimal color-values that contain an alpha component
	scss = scss.replace(/([:=,\[]\s*)(["']?)(\#[0-9A-Fa-f]+)\2/g, function(match, prefix, quoted, value) {
		// If already quoted, ignore
		if (!quoted) {
			return prefix + '"' + value + '"';
		}
		return match;
	});

	// Replace array-values with a temporary construction that gets it through SASS-customs
	scss = scss.replace(reDeclArray, function(match, key, v) {
		var values = v.split(','),
			newValue = '--stss-array' + arrayIdx + '(',
			ln = values.length,
			tempName, value, isObject, i;

		for (i = 0; i < ln; i++) {
			value = values[i].trim();
			isObject = /^\{[\s\S]+\}$/.test(value);
			
			if (isObject) {
				tempName = 'stss-array' + arrayIdx + '-obj' + i;
				arrayDecl.push('-' + tempName + value);
			} else {
				tempName = 'stss-array' + arrayIdx + '-val' + i;
				arrayDecl.push('-' + tempName + '{ text: ' + value + '}');
			}

			newValue += tempName + ' ';
		}

		newValue = newValue.slice(0, -1) + ')';
		arrayIdx++;
		return key + ": " + newValue;
	});

	// Append the temporary array-declarations to the end of the SCSS
	arrayDecl.forEach(function(decl) {
		scss += '\n' + decl;
	});

	return scss;
};

/**
 * Parse the error string into a new Error object.
 * 
 * @param	{String}	msg  		Error message (as generated by node-sass)
 * @param	{String}	stss 		SCSS source (that potentially contains the error if it is source-based)
 * @param	{Object}	options		Dictionary containing additional instructions
 * @return	{Error}					Error instance
 */
function parseError(msg, statement, stss, options) {
	var prefix = 'An error occurred while parsing the STSS',
		newMsg, err, line;

	if (statement) {
		line = getLineInfo(stss, statement);
	}

	if (options.filename) {
		prefix += ' for ' + options.filename;
	}
	prefix += ' (line: ' + line.number + '):';

	err = new Error(prefix + '\n\t' + line.content + '\n' + msg);
	err.original = msg;
	err.processed = msg;
	err.title = prefix;
	err.file = options.filename || '';

	if (line) {
		err.line = line.content;
		err.lineNr = line.number;
	}

	return err;
}

/**
 * Get the line and line number that contains the provided statement.
 * 
 * @param  {String}		text   		Source text
 * @param  {String}		statement 	The statment
 * @return {Object}     	   		Line information
 */
function getLineInfo(text, statement) {
	var info = false,
		reStmnt = new RegExp(statement),
		lines = text.split(/\r\n|\n|\r|\f/),
		ln = lines.length,
		i = -1;
	
	while (!info && ++i < ln) {
		if (reStmnt.test(lines[i])) {
			info = {
				content: lines[i].trim(),
				number: i + 1
			};
		}
	}

	return info;
}