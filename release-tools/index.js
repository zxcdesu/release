const {execSync} = require('child_process');

const version = process.argv[2];

console.log(1, version);
console.log(2, execSync(`git tag`, { encoding: 'utf8' }));
console.log(3, execSync(`git describe --abbrev=0 --tags ${version}^`, { encoding: 'utf8' }));
