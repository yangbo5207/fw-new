var inquirer = require('inquirer');
var fs = require('fs-extra');
var path = require('path');
var chalk = require('chalk');
var _ = require('lodash');
var ora = require('ora');
var execSync = require('child_process').execSync;
var spawn = require('cross-spawn');

var spinner = ora();

var ownPath = __dirname;

function appUpgrade(projectName) {
  var root = path.resolve(projectName);
  var oldPackagePath = path.resolve(root, 'package.json');
  var newPackagePath = path.resolve(ownPath, 'template', 'package.json')
  var oldPackageFile = require(oldPackagePath);
  var newPackageFile = require(newPackagePath);

  if (!fs.existsSync(root)) {
    spinner.fail(chalk.red(root) + ' 貌似不存在！');
    process.exit();
  }

  if (!fs.existsSync(oldPackagePath)) {
    spinner.fail('项目目录下package.json貌似不存在！');
    process.exit();
  }

/*   console.log('正在检查版本号是否变化');
  if (newPackageFile.version === oldPackageFile.version) {
    console.log('脚手架没有新内容');
    return ;
  } */

  inquirer
    .prompt([
      {
        name: 'upgrade',
        type: 'confirm',
        message:
          '请确认是否要将 ' +
          oldPackageFile.name +
          ' 升级到最新？',
        default: true
      }
    ])
    .then(answers => {
      if (answers.upgrade) {
        var questions = [];

        questions.push({
          name: 'install',
          type: 'confirm',
          message:
            '由于安装以及升级了部分依赖，为了保证项目正常运行，需要重新安装所有依赖，请确认是否继续？\n' +
            chalk.dim('该操作将会： 1. 删除 node_modules 目录; 2. 重新运行 npm install 命令') +
            '\n',
          default: false
        });

        inquirer.prompt(questions).then(answers => {
          console.log();

          newPackageFile.name = oldPackageFile.name;
          newPackageFile.version = oldPackageFile.version;
          newPackageFile.description = oldPackageFile.description;
          newPackageFile.author = oldPackageFile.author;

          fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(newPackageFile, null, 2));

          if (answers.install) {
            process.chdir(root);
            spinner.text = '删除 node_modules ...';
            spinner.start();
            fs.removeSync(path.join(root, 'node_modules'));
            spinner.stop();
            spinner.succeed('删除 node_modules 目录成功！即将重新安装所有依赖...');

            install(function () {
              console.log();
              spinner.succeed('恭喜！项目升级成功！全部依赖已成功重新安装！');
            });
          } else {
            console.log();
            spinner.succeed(
              '项目升级成功！但是你可能需要重新手动安装确实的依赖。\n  运行 ' +
              chalk.green((shouldUseYarn() ? 'yarn' : 'npm') + ' install')
            );
          }
        });
      } else {
        spinner.fail('升级已取消！');
      }
    });
}

function shouldUseYarn() {
  try {
    execSync('yarn --version', {
      stdio: 'ignore'
    });
    return true;
  } catch (e) {
    return false;
  }
}

function install(callback) {
  var command;
  var args;
  if (shouldUseYarn()) {
    command = 'yarn';
  } else {
    command = 'npm';
  }

  args = ['install'];

  var child = spawn(command, args, {
    stdio: 'inherit'
  });

  child.on('close', function (code) {
    callback(code, command, args);
  });

  process.on('exit', function () {
    child.kill();
  });
}

module.exports = appUpgrade;
