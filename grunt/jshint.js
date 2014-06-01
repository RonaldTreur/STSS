module.exports = {
	options: {
		curly: true,
		eqeqeq: true,
		immed: true,
		latedef: 'nofunc',
		newcap: true,
		noarg: true,
		sub: true,
		undef: true,
		boss: true,
		expr: true,
		eqnull: true,
		browser: true,
		reporter: require('jshint-stylish'),
		globals: {
			require: true,
			module: true,
			exports: true,
			console: true,
			process: true
		}
	},
	grunt: ['Gruntfile.js', 'grunt/*.js'],
	core: ['./stss.js', 'lib/**/*.js', 'bin/stss']
};