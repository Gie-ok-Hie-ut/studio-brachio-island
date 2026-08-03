const fs = require("fs");
const path = require("path");

const { assertBalancedCssBraces, bundles } = require("./build-assets");

const rootDir = path.resolve(__dirname, "..");
const sourceRoots = {
  ".css": "versions/src/css",
  ".js": "versions/src/js",
};
const retiredSourceFiles = [
  "versions/src/css/40-reader-and-popups.css",
  "versions/src/css/50-responsive.css",
  "versions/src/css/90-page-overrides.css",
  "versions/src/js/20-popup-hash-and-settings.js",
];

let failed = false;

function fail(message) {
  failed = true;
  console.error(message);
}

function toRelative(absolutePath) {
  return path.relative(rootDir, absolutePath).split(path.sep).join("/");
}

function listSourceFiles(sourceRoot, extension) {
  const absoluteRoot = path.join(rootDir, sourceRoot);
  return fs
    .readdirSync(absoluteRoot)
    .filter((file) => file.endsWith(extension))
    .sort()
    .map((file) => `${sourceRoot}/${file}`);
}

function assertNoDuplicateSources(sources, output) {
  const seen = new Set();
  sources.forEach((source) => {
    if (seen.has(source)) {
      fail(`${output} lists ${source} more than once.`);
    }
    seen.add(source);
  });
}

function assertSourceSetMatchesDirectory(extension, listedSources) {
  const actualSources = listSourceFiles(sourceRoots[extension], extension);
  const listedSet = new Set(listedSources);
  const actualSet = new Set(actualSources);

  actualSources.forEach((source) => {
    if (!listedSet.has(source)) {
      fail(`${source} exists but is not listed in scripts/build-assets.js.`);
    }
  });

  listedSources.forEach((source) => {
    if (!actualSet.has(source)) {
      fail(`${source} is listed in scripts/build-assets.js but does not exist.`);
    }
  });

  const sortedListed = [...listedSources].sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
  if (listedSources.join("\n") !== sortedListed.join("\n")) {
    fail(`${sourceRoots[extension]} partials must stay ordered by filename in scripts/build-assets.js.`);
  }
}

bundles.forEach((bundle) => {
  assertNoDuplicateSources(bundle.sources, bundle.output);
});

Object.keys(sourceRoots).forEach((extension) => {
  const listedSources = bundles.flatMap((bundle) =>
    bundle.sources.filter((source) => source.endsWith(extension))
  );
  assertSourceSetMatchesDirectory(extension, listedSources);
});

retiredSourceFiles.forEach((source) => {
  if (fs.existsSync(path.join(rootDir, source))) {
    fail(`${source} has been retired. Add focused partials instead of recreating it.`);
  }
});

listSourceFiles(sourceRoots[".css"], ".css").forEach((source) => {
  const absolutePath = path.join(rootDir, source);
  assertBalancedCssBraces(toRelative(absolutePath), fs.readFileSync(absolutePath, "utf8"));
});

const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
const checkJs = packageJson.scripts?.["check:js"] || "";
if (!checkJs.includes("node scripts/check-js-source.js")) {
  fail("package.json check:js must run scripts/check-js-source.js.");
}
if (checkJs.includes("versions/src/js/*.js")) {
  fail("package.json check:js must not use a shell-expanded versions/src/js/*.js syntax check.");
}

if (failed) process.exit(1);

console.log("Asset source structure passed.");
