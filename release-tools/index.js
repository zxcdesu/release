const {execSync} = require('child_process');

const version = process.argv[2];
console.log(
  'current',
  version,
  'previous',
  execSync(`git describe --abbrev=0 --tags`, { encoding: 'utf8' }),
  execSync(`git describe --abbrev=0 --tags ${version}^`, { encoding: 'utf8' }),
);
