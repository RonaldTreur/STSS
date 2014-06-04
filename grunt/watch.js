module.exports = {
	options: {
		interrupt: true
	},
	jshint: {
		files: ['./stss.js', 'lib/**/*.js', 'bin/stss', 'scripts/*.js', 'lib/alloy.jmk'],
		tasks: ['jshint:core']
	}
};