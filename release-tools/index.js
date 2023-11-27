const {execSync} = require("child_process");

const version = process.argv[2];
const diff = execSync(
  `git --no-pager diff $(git describe --abbrev=0 --tags ${version}^) --minimal --name-only`,
  {
    encoding: "utf8",
  },
)
  .trim()
  .split("\n");

console.log(1, version);
console.log(2, diff);
