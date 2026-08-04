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

function assertNoPattern(relativePath, pattern, message) {
  const source = fs.readFileSync(path.join(rootDir, relativePath), "utf8");
  if (pattern.test(source)) {
    fail(`${relativePath}: ${message}`);
  }
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

const cssSourceFiles = listSourceFiles(sourceRoots[".css"], ".css");
cssSourceFiles.forEach((source) => {
  assertNoPattern(
    source,
    /\.role-detail-layout-[\w-]+[^{]*\.role-section-title h2[^{]*{[^}]*\b(?:font|font-size|line-height)\s*:/gs,
    "role heading typography must stay in the shared role-section-title rules."
  );
  assertNoPattern(
    source,
    /\.(?:engineer-scroll|cv-scroll|role-items|identity-detail)\b[^{]*{[^}]*\boverflow(?:-[xy])?\s*:/gs,
    "role list/body scroll must stay on .role-scroll-region unless a new documented exception is added."
  );
  assertNoPattern(
    source,
    /\.reader-content\s+\.gallery-|\.popup-window-gallery\s+\.reader-content|\.popup-window-gallery\s+\.reader-setting-control/g,
    "gallery popup styles must target gallery popup classes instead of reader content/control classes."
  );
  assertNoPattern(
    source,
    /\.(?:reader|pdf)-(?:modal|backdrop|window|toolbar|actions)\b|\.reader-content\b|\.reader-setting-control\b|\.reader-kicker\b/g,
    "legacy popup alias classes have been retired. Use popup-* shell and variant classes."
  );
  assertNoPattern(
    source,
    /\.(?:list|writing-list|writing-title|source-options)\b/g,
    "legacy writing/list selectors have been retired. Use role-items or a focused component class."
  );
  assertNoPattern(
    source,
    /\.gallery-asset(?:-|\b)/g,
    "legacy gallery asset selectors have been retired. Use gallery-project popup classes."
  );
});

const jsSourceFiles = listSourceFiles(sourceRoots[".js"], ".js");
jsSourceFiles.forEach((source) => {
  assertNoPattern(
    source,
    /\b(?:galleryAssetFiles|openGalleryAsset|createGalleryAssetButton|createGalleryMarkdownButton)\b/g,
    "legacy gallery asset helpers have been retired. Use gallery project helpers."
  );
  assertNoPattern(
    source,
    /\breaderTheme\b|#reader-theme|readerSettings\.theme|dataset\.theme/g,
    "reader theme controls have been retired. Reader settings are limited to lang, size, and spacing."
  );
});

assertNoPattern(
  "versions/src/js/23-localization-refresh.js",
  /reader-window-gallery/g,
  "gallery popup variant must use the shared popup-window-gallery class."
);

assertNoPattern(
  "scripts/build-pages.js",
  /class="[^"]*\b(?:reader-(?:modal|backdrop|window|toolbar|actions|content|setting-control|kicker)|pdf-(?:modal|backdrop|window|toolbar))\b/g,
  "active page template must not emit legacy popup alias classes."
);

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
