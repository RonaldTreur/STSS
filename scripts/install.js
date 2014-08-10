var fs = require('fs'),
    chalk = require('chalk'),
    path = require('path');

function install(root) {
    var appDir = path.join(root, 'app'),
        src = path.join(__dirname, '..', 'lib', 'alloy.jmk'),
        dst = path.join(appDir, 'alloy.jmk');

    console.log('Trying to add pre-compile hook to alloy.jmk...');

    // install alloy.jmk
    if (fs.existsSync(appDir)) {
        if (!fs.existsSync(dst)) {
            fs.writeFileSync(dst, fs.readFileSync(src));
            console.log(chalk.green('Hook was successfully installed'));
        } else {
            var content = fs.readFileSync(dst, {encoding: 'utf8'});
            if (!/function stss/.test(content)) {
                fs.appendFileSync(dst, fs.readFileSync(src));
                console.log(chalk.green('Hook was successfully installed'));
            } else {
                try {
                    var newVersion = process.env.npm_package_version.split('.'),
                        newVersionNr = (newVersion[0]*1000 + newVersion[1])*1000 + newVersion[2],
                        installedVersion = content.match(/function stss\(config, logger\) { \/\/--v(\d+)\.(\d+)\.(\d+)/).slice(1),
                        installedVersionNr = (installedVersion[0]*1000 + installedVersion[1])*1000 + installedVersion[2];

                    if (installedVersionNr >= newVersionNr) {
                        console.log(chalk.yellow('Hook was already installed'));
                    } else {
                        var newSource = fs.readFileSync(src, {encoding: 'utf8'}),
                            reFunction = /function stss\(config, logger\) { \/\/--v\d+\.\d+\.\d+([\s\S]+?)^}$/gm;

                        newSource = newSource.match(reFunction)[0];
                        content = content.replace(reFunction, newSource);
                        fs.writeFileSync(dst, content);
                        console.log(chalk.green('Hook was successfully updated to v'+newVersion.join('.')));
                    }
                } catch(e) {
                    console.log(chalk.red('Hook could not be updated to v'+newVersion.join('.') + ' automatically, please update it manually'));
                }
            }
        }
    } else {
        console.log(chalk.red('Could not find the "app"-folder in working directory ('+root+').\n') + chalk.red.bold('The pre-compile-hook was not installed!'));
    }
}

if (require.main === module) {
    // Only run install if not installed globally
    if (process.env.npm_config_global === "true") {
        console.log('STSS is installed globally\n' + chalk.blue('Use "stss --jmk" in your project\'s root folder to install the compile-hook.'));
        return;
    }

    var root = process.cwd().replace(/(.+[\/\\])node_modules.+/, '$1');
    install(root);
} else {
    module.exports = install;
}