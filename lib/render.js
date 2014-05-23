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
		emitter.emit('warn', chalk.green('Rendering Complete, saving .tss file...'));

		fs.writeFile(options.outFile, tss, function(err) {
			if (err) { return emitter.emit('error', chalk.red('Error: ' + err)); }

			emitter.emit('warn', chalk.green('Wrote TSS to ' + options.outFile));
    		emitter.emit('write', err, options.outFile, tss);
		});
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
	stss({
		file: options.inFile,
		success: function(tss) {
			finalize(tss, options, emitter);
		},
		error: function(err) {
			emitter.emit('error', chalk.red('Error: ' + err));
		}
	});
};