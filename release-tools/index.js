const {execSync} = require("child_process");
const {appendFileSync} = require("fs");
const {EOL} = require("os");

function setOutput(key, value) {
  // Temporary hack until core actions library catches up with github new recommendations
  appendFileSync(process.env["GITHUB_OUTPUT"], `${key}=${value}${EOL}`);
}

const version = process.argv[2];
const diff = execSync(
  `git --no-pager diff $(git describe --abbrev=0 --tags ${version}^) --minimal --name-only`,
  {
    encoding: "utf8",
  },
)
  .trim()
  .split("\n");

setOutput("release", diff);
