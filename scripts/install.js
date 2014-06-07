var fs = require('fs'),
    path = require('path');

function install(root) {
    var appDir = path.join(root, 'app'),
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
        console.log('Could not find the "app"-folder, compile-hook not installed!');
    }
}
module.exports = install;

if (require.main === module) {
    // Only run install if not installed globally
    if (process.env.global === true) {
        console.log('STSS is installed globally, use "stss -jmk" in your project\'s root folder to install the compile-hook.');
        return;
    }

    var root = process.cwd().replace(/(.+[\/\\])node_modules.+/, '$1');
    install(root);
}