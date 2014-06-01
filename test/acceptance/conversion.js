var should = require('should'),
	fs = require('fs'),
	path = require('path'),
	stss = require('./../../stss'),
	inputPath = __dirname + '/stss',
	outputPath = __dirname + '/tss';

function testConversion(file) {
	var inputFile = inputPath + '/' + file,
		outputFile = outputPath + '/' + path.basename(file, '.stss') + '.tss',
		testName = path.basename(file, '.stss');


	describe('Rendering '+testName, function() {
		var result;

		it('should complete successfully', function(done) {
			stss.renderSync({
				file: inputFile,
				success: function(tss) {
					result = tss;
					done();
				},
				error: function(err) {
					throw err;
				}
			});
		});

		it('should produce correct tss', function() {
			var valid = fs.readFileSync(outputFile, {encoding: 'utf8'});
			valid.should.match(result);
		});
	});
}

var list = fs.readdirSync(inputPath);
list.forEach(function (file) {
	testConversion(file);
});
	