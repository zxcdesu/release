const {execSync} = require('child_process');

console.log(1, version);
console.log(2, execSync(`git describe --abbrev=0 --tags`, { encoding: 'utf8' }));
console.log(3, execSync(`git describe --abbrev=0 --tags ${version}^`, { encoding: 'utf8' }));
