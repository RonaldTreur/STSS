var fs = require('fs'),
    chalk = require('chalk'),
    path = require('path');

function install(root) {
    var appDir = path.join(root, 'app'),
        src = path.join(__dirname, '..', 'lib', 'alloy.jmk'),
        dst = path.join(appDir, 'alloy.jmk');

    console.log('Trying to install pre-compile hook in alloy.jmk...');

    // install alloy.jmk
    if (fs.existsSync(appDir)) {
        if (!fs.existsSync(dst)) {
            fs.writeFileSync(dst, fs.readFileSync(src));
            console.log(chalk.green('Hook was successfully installed'));
        } else {
            var content = fs.readFileSync(dst);
            if (!/function\s+stss/.test(content)) {
                fs.appendFileSync(dst, fs.readFileSync(src));
                console.log(chalk.green('Hook was successfully installed'));
            } else {
                console.log(chalk.yellow('Hook was already installed'));
            }
        }
    } else {
        console.log(chalk.red('Could not find the "app"-folder in working directory ('+root+').\n') + chalk.red.bold('The pre-compile-hook was not installed!'));
    }
}

if (require.main === module) {
    // Only run install if not installed globally
    if (process.env.npm_config_global === "true") {
        console.log('STSS is installed globally\n' + chalk.blue('Use "stss -jmk" in your project\'s root folder to install the compile-hook.'));
        return;
    }

    var root = process.cwd().replace(/(.+[\/\\])node_modules.+/, '$1');
    install(root);
} else {
    module.exports = install;
}