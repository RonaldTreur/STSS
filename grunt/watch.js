module.exports = {
	options: {
		interrupt: true
	},
	jshint: {
		files: ['./stss.js', 'lib/**/*.js', 'bin/stss'],
		tasks: ['jshint:core']
	}
};