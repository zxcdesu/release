const {execSync} = require("child_process");
const {appendFileSync} = require("fs");
const {EOL} = require("os");

function setOutput(key, value) {
  appendFileSync(process.env["GITHUB_OUTPUT"], `${key}=${value}`.concat(EOL));
}

const version = process.argv[2];
const diff = execSync(
  `git --no-pager diff $(git describe --abbrev=0 --tags ${version}^) --minimal --name-only`,
)
  .toString('utf8')
  .trim()
  .split("\n");

setOutput("DOCKER", JSON.stringify(diff));
