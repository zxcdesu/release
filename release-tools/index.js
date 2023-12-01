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

const nextVersion = process.argv[2];

console.log("next version is", nextVersion);

const diff = execSync(
  `git --no-pager diff $(git describe --abbrev=0 --tags ${nextVersion}^) --minimal --name-only`,
  {
    encoding: "utf8"
  },
)
  .trim()
  .split("\n");

const apps = new Set();
const libs = new Set();

for (const path of diff) {
  const [root, workspace] = path.split("/");
  if (path.startsWith("libs/") || path.startsWith(`apps/${workspace}/lib/`) || path.endsWith('package.json'))
    libs.add(join(root, workspace));
  if (path.startsWith("apps/")) apps.add(workspace);
}

const workspaces = [].concat(getWorkspaces('apps'), getWorkspaces('libs'))

apps.forEach((workspace1) => {
  const workspace = workspaces.find((workspace2) => workspace2.workspace === workspace1);
  workspace.patch(workspace.name, version);
});

libs.forEach((workspace1) => {
  patchRecursive(
    workspaces,
    libs,
    apps,
    workspaces.find(
      (workspace2) =>
        join(workspace2.root, workspace2.workspace) === workspace1
    ).name,
    nextVersion,
  );
});

console.log("updated libs", libs);
console.log("updated apps", apps);

if (libs.size + apps.size > 0) {
  execSync("git add --all", { encoding: "utf8" });
  execSync(`git commit -m ${nextVersion}`, { encoding: "utf8" });
  execSync("git push origin HEAD:main", { encoding: "utf8" });

  Array.from(libs).map((workspace1) => {
    const lib = workspaces.find(
      (workspace2) => join(workspace2.root, workspace2.workspace) === workspace1
    ).name;
    return execSync(`yarn workspace ${lib} run lib:build`, { encoding: "utf8" });
  });

  if (apps.size) setOutput("DOCKER", JSON.stringify(Array.from(apps)));
} else console.log("no changes found");

execSync(`git tag -d ${nextVersion}`, { encoding: "utf8" });
execSync(`git push --delete origin ${nextVersion}`, { encoding: "utf8" });

execSync(`git tag -a -m ${nextVersion} ${nextVersion}`, { encoding: "utf8" });
execSync(`git push origin ${nextVersion}`, { encoding: "utf8" });
