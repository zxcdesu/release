const {execSync} = require("child_process");
const {
  appendFileSync,
  existsSync,
  readdirSync: readDirSync,
  readFileSync,
  writeFileSync,
} = require("fs");
const {EOL} = require("os");
const {join} = require("path");

function setOutput(key, value) {
  appendFileSync(process.env["GITHUB_OUTPUT"], `${key}=${value}`.concat(EOL));
}

function getWorkspaces(root) {
  return readDirSync(root).map((workspace) => {
    const packageJsonPath = join(root, workspace, "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath));
    return {
      name: packageJson.name,
      root,
      workspace,
      lib: root === "libs" || existsSync(join(root, workspace, "lib")),
      app: root === "apps",
      patch: (name, version) => {
        let result =
          name === packageJson.name && packageJson.version !== version;

        if (
          typeof packageJson.dependencies?.[name] !== "undefined" &&
          packageJson.dependencies[name] !== version
        ) {
          packageJson.dependencies[name] = version;
          result = true;
        }

        if (result) {
          if (packageJson.version !== version) {
            packageJson.version = version;
          }

          writeFileSync(
            packageJsonPath,
            JSON.stringify(packageJson, null, 2).concat("\n")
          );
        }

        return result;
      },
    };
  });
}

function patchRecursive(workspaces, libs, apps, name, version) {
  workspaces.forEach((workspace) => {
    if (workspace.patch(name, version)) {
      patchRecursive(workspaces, libs, apps, workspace.name, version);
      if (workspace.lib) libs.add(join(workspace.root, workspace.workspace));
      if (workspace.app) apps.add(workspace.workspace);
    }
  });
}

const version = process.argv[2];
const lastVersion = execSync(`git describe --abbrev=0 --tags ${version}^`).toString("utf8");

console.log(`current version is ${version}`);
console.log(`found last version is ${lastVersion}`);

const diff = execSync(
  `git --no-pager diff $(git describe --abbrev=0 --tags ${version}^) --minimal --name-only`,
)
  .toString("utf8")
  .trim()
  .split("\n");

const apps = new Set();
const libs = new Set();

for (const path of diff) {
  const [root, workspace] = path.split("/");
  if (path.startsWith("libs/") || path.startsWith(`apps/${workspace}/lib/`));
    libs.add(join(root, workspace));
  if (path.startsWith("apps/")) apps.add(workspace);
}

const workspaces = [].concat(getWorkspaces('apps'), getWorkspaces('libs'))

libs.forEach((workspace1) => {
  patchRecursive(
    workspaces,
    libs,
    apps,
    workspaces.find(
      (workspace2) =>
        join(workspace2.root, workspace2.workspace) === workspace1
    ).name,
    version,
  );
});

if (libs.size + apps.size > 0) {
  execSync("git add --all");
  execSync(`git commit -m ${version}`);
  execSync("git push origin HEAD:main");

  console.log(libs);

  Array.from(libs).map((workspace1) => {
    const lib = workspaces.find(
      (workspace2) => join(workspace2.root, workspace2.workspace) === workspace1
    ).name;
    return execSync(`yarn workspace ${lib} run lib:build`);
  });

  console.log(apps);

  if (apps.size) setOutput("DOCKER", JSON.stringify(Array.from(apps)));
} else console.log("no changes found");

execSync(`git tag -d ${version}`);
execSync(`git push --delete origin ${version}`);

const actualVersion = version.slice(1);
execSync(`git tag -a -m ${actualVersion} ${actualVersion}`);
execSync(`git push origin ${actualVersion}`);
