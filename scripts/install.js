var fs = require('fs'),
    path = require('path');

var pkg = require('../package'),
    NAME = pkg.name,
    VERSION = pkg.version;

var root = process.cwd().replace(/(.+[\/\\])node_modules.+/, '$1'),
    appDir = path.join(root, 'app'),
    src = path.join(__dirname, '..', 'lib', 'alloy.jmk'),
    dst = path.join(appDir, 'alloy.jmk');

console.log('Trying to install alloy.jmk:');
console.log(' - working dir: '+ process.cwd());
console.log(' - project: '+ root);
console.log(' - app dir: '+ appDir);
console.log(' - JMK src: '+ src);
console.log(' - JMK dst: '+ dst);

// install alloy.jmk
if (fs.existsSync(appDir)) {
    if (!fs.existsSync(dst)) {
        fs.writeFileSync(dst, fs.readFileSync(src));
    } else {
        var content = fs.readFileSync(dst);
        if (!/function\s+stss/.test(content)) {
            fs.appendFileSync(dst, fs.readFileSync(src));
        }
    }
} else {
    console.log(appDir + ' does not exist');
}