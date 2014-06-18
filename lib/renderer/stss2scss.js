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
	reImports = /@import[\s\t]+([^;]+);/g,
	reImport = /(["'])(.+?)\1/g;

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
module.exports = function render (stss, options) {
	var stssDir = options.file ? path.dirname(path.join(process.cwd(), options.file)) : process.cwd(),
		scss;
	
	// Replace hyphenated terms with camelCased variants
	scss = stss.replace(reDeclCSS, function(match, key, value) {
		if (key.search(/-/) !== -1) {
			key = key.replace(/-([a-z])/, function(pm, letter) {
				return letter.toUpperCase();
			});
		}

		return key + ": " + value;
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

	// Wrap any term using dots into quotes
	scss = scss.replace(/(["']?)(\w+(?=\.)[\w.]+)\1/g, function(match, quoted, value) {
		if (!quoted) {
			return '"' + value + '"';
		}
		return match;
	});

	// Resolve all @import-statements recursively
	try {
		scss = scss.replace(reImports, function(match, imports) {
			var imported = '';

			imports = imports.replace(reImport, function(match, quotes, filename) {
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
					throw new Error('Could not locate STSS file to import: ' + filename);
				}
				
				content = render(fs.readFileSync(file, 'utf-8'), {
					includePaths: importPaths,
					file: filename
				});

				imported += content + "\n";
			
				return content;
			});

			return imported;
		});
	} catch (err) {
		return err;
	}

	return scss;
};