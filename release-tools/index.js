const {execSync} = require('child_process');

const version = process.argv[2];
console.log(
  'current',
  version,
  'previous',
  execSync(`git tag --sort=-creatordate | grep -A 1 ${version} | tail -n 1`, { encoding: 'utf8' })
);
