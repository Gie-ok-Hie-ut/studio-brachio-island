const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");

const bundles = [
  {
    output: "versions/version-15.css",
    sources: [
      "versions/src/css/00-foundation.css",
      "versions/src/css/05-site-chrome.css",
      "versions/src/css/10-role-layouts.css",
      "versions/src/css/20-gallery-index.css",
      "versions/src/css/30-novel.css",
      "versions/src/css/40-reader-and-popups.css",
      "versions/src/css/50-responsive.css",
      "versions/src/css/60-home-signal.css",
      "versions/src/css/70-role-room.css",
    ],
  },
  {
    output: "versions/version-15.js",
    sources: [
      "versions/src/js/00-state.js",
      "versions/src/js/10-navigation-and-home-scroll.js",
      "versions/src/js/20-popup-hash-and-settings.js",
      "versions/src/js/30-novel.js",
      "versions/src/js/40-gallery.js",
      "versions/src/js/50-role-common.js",
      "versions/src/js/60-todays-signal.js",
      "versions/src/js/70-role-pages.js",
      "versions/src/js/80-reader-modal.js",
      "versions/src/js/90-markdown-reader.js",
      "versions/src/js/99-bootstrap.js",
    ],
  },
];

const checkOnly = process.argv.includes("--check");

function stripCssCommentsAndStrings(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, "");
}

function assertBalancedCssBraces(relativePath, source) {
  const stripped = stripCssCommentsAndStrings(source);
  let depth = 0;

  for (const char of stripped) {
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth < 0) {
      throw new Error(`${relativePath} has an unmatched closing CSS brace.`);
    }
  }

  if (depth !== 0) {
    throw new Error(`${relativePath} has unclosed CSS braces.`);
  }
}

function readSource(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  const source = fs.readFileSync(absolutePath, "utf8").replace(/\s*$/, "\n");
  if (relativePath.endsWith(".css")) {
    assertBalancedCssBraces(relativePath, source);
  }
  return source;
}

function buildBundle(bundle) {
  return bundle.sources.map(readSource).join("\n");
}

let hasMismatch = false;

for (const bundle of bundles) {
  const outputPath = path.join(rootDir, bundle.output);
  const nextContent = buildBundle(bundle);

  if (checkOnly) {
    const currentContent = fs.readFileSync(outputPath, "utf8");
    if (currentContent !== nextContent) {
      hasMismatch = true;
      console.error(`${bundle.output} is not built from source partials.`);
    }
    continue;
  }

  fs.writeFileSync(outputPath, nextContent);
  console.log(`Built ${bundle.output}`);
}

if (hasMismatch) {
  process.exit(1);
}
