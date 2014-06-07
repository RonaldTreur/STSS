var render = require('./render'),
    path = require('path'),
    cwd = process.cwd(),
    Emitter = require('events').EventEmitter,
	yargs = require('yargs');

// Setup yargs
yargs
	.usage('Compile .stss files with STSS.\nUsage: $0 [options] <input.stss> [<output.tss>]')
	.example('$0 stss/app.stss tss/app.tss', 'Compile app.stss to app.tss')
	//.options('watch', {
	//	describe: 'Watch a directory or file',
	//	alias: 'w'
	//})
 	.options('include-path', {
  		describe: 'Path to look for @import-ed files',
  		'default': cwd
  	})
	.options('output', {
		describe: 'Output tss file',
		alias: 'o'
	})
	.options('shorthand', {
		describe: 'JSON file containing additional shorthand notations',
		alias: 's'
	})
	.options('jmk', {
		describe: 'Install the auto-convert hook into the alloy.jmk file for this project. Run from the project\'s root!'
	})
	.options('stdout', {
		describe: 'Print the resulting TSS to stdout'
	})
	.options('verbose', {
		describe: 'Print the output from the various conversion steps as they occur',
		alias: 'v'
	})
	.options('help', {
		describe: 'Print usage info',
		type: 'string',
		alias: 'h'
	});
	// .check(function(argv){
	// 	if (argv.help) { return true; }
	// 	if (argv._.length < 1) { return false; }
	// });

function parseArguments(args) {
	var argv = yargs.parse(args);

	if (argv.help) {
		yargs.showHelp();
		process.exit(0);
		return;
	}

	if (argv.jmk) {
		var install = require('../scripts/install');
		install(process.cwd());
		process.exit(0);
		return;
	}	

	var options = {
		stdout: argv.stdout,
		verbose: argv.verbose
	};

	var inFile = options.inFile = argv._[0];
	var outFile = options.outFile = argv.o || argv._[1];

	if (!outFile) {
		var suffix = '.tss';
		if (/\.tss$/.test(inFile)) {
			suffix = '';
		}
		outFile = options.outFile = path.join(path.dirname(inFile), path.basename(inFile, '.stss') + suffix);
	}

	options.includePaths = argv['include-path'];
	if (!Array.isArray(options.includePaths)) {
		options.includePaths = [options.includePaths];
	}

	options.shFile = argv['shorthand'];

	return options;
}

exports = module.exports = function(args) {
	var emitter = new Emitter();

	emitter.on('error', function(err){
		console.error(err);
		process.exit(1);
	});

	var options = parseArguments(args);

	render(options, emitter);
	return emitter;
};