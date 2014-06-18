var fs = require('fs'),
	stss  = require('../stss'),
	chalk = require('chalk');

/**
 * Finalize the TSS data when rendering is done.
 *
 * @private
 * @param 	{String}	tss     	TSS structured markup
 * @param 	{Object}	options		Dictionary containing instructions
 * @param 	{Emitter} 	emitter		Event emitter for errors, warning and logging
 */
function finalize(tss, options, emitter) {
	if (options.outFile) {
		emitter.emit('warn', chalk.green('Rendering ') + chalk.green.bold('complete') + chalk.green('! Saving to ') + options.outFile);

		if (tss) {
			fs.writeFile(options.outFile, tss, function(err) {
				if (err) { return emitter.emit('error', chalk.red('Error: ' + err)); }

				emitter.emit('warn', chalk.green('Wrote TSS to ' + options.outFile));
	    		emitter.emit('write', err, options.outFile, tss);
			});
		} else {
			emitter.emit('warn', chalk.yellow.underline('Resulting TSS was empty, file was written'));
		}
	}

	if (options.stdout) {
		emitter.emit('log', tss);
	}
}

/**
 * Render STSS to TSS using the supplied instructions.
 * 
 * @param 	{Object}	options		Dictionary containing instructions
 * @param 	{Emitter} 	emitter		Event emitter for errors, warning and logging
 */
module.exports = function(options, emitter) {
	var renderOptions = {
		file: options.inFile,
		success: function(tss) {
			finalize(tss, options, emitter);
		},
		error: function(err) {
			emitter.emit('error', chalk.red('Error: ' + err));
		}
	};

	if (options.verbose) {
		stss.on('conversionStep', function(conversion, output) {
			emitter.emit('log', chalk.blue.bold.underline('\nConversion to ' + conversion.toUpperCase() + ' completed:\n') + output);
		});
	}

	if (options.shFile) {
		renderOptions.shFile = options.shFile;
	}

	if (options.includePaths) {
		renderOptions.includePaths = options.includePaths;
	}

	stss.render(renderOptions);
};