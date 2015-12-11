var path = require('path');
var spawn = require('child_process').spawn;
var fs = require('fs-extra');
var rimraf = require('rimraf').sync;
var mkdirp = require('mkdirp').sync;

var codeToRunPath = path.join(__dirname, 'code-to-run.js');
var projectPath = path.join(__dirname, 'project');
var nodeModulesPath = path.join(projectPath, 'node_modules');
var indexFileLocation = path.join(projectPath, 'index.js');

var reduxAwaitPath = path.join(__dirname, '..', '..');
var reduxAwaitLibPath = path.join(reduxAwaitPath, 'lib');
var _mochaPath = path.join(reduxAwaitPath, 'node_modules', '.bin', '_mocha');

rimraf(projectPath);
mkdirp(nodeModulesPath);

fs.copySync(reduxAwaitLibPath, nodeModulesPath);
fs.copySync(codeToRunPath, indexFileLocation)

spawn(_mochaPath, ['--require', 'babel/register', indexFileLocation], {stdio: 'inherit'}).on('exit', process.exit);
