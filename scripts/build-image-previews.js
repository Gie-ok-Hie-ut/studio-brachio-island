const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const outputPath = path.join(root, "image-previews.js");
const previewDirectory = path.join(root, "assets", "previews");
const checkOnly = process.argv.includes("--check");
const settings = {
  version: 1,
  widths: [160, 320, 640, 960, 1280],
  format: "webp",
  quality: 90,
  effort: 6,
  alphaQuality: 100,
  autoOrient: true,
  keepIccProfile: true,
  fastShrinkOnLoad: false,
  sharp: require("../package.json").devDependencies.sharp
};
const hash = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const settingsHash = hash(JSON.stringify(settings));

function readGlobal(file, name) {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(file, "utf8"), sandbox, { timeout: 1000, filename: file });
  return sandbox.window[name];
}

function cleanAsset(asset) {
  return String(asset || "").trim().replace(/^["']|["']$/g, "");
}

// Match resolveGalleryProjectAsset / resolveNovelProjectAsset in 40-gallery.js.
function resolveAsset(item, asset) {
  const clean = cleanAsset(asset);
  if (!clean || /^(https?:|data:|blob:|\/\/)/i.test(clean)) return "";
  if (clean.startsWith("content/") || clean.startsWith("../") || clean.startsWith("/")) return clean;
  if (item.type === "gallery" && clean.startsWith("assets/")) return `content/gallery/${clean}`;
  const directory = path.posix.dirname(String(item.path || "").replace(/\\/g, "/"));
  return `${directory === "." ? (item.type === "gallery" ? "content/gallery" : "content") : directory}/${clean.replace(/^\.\//, "")}`;
}

function collectSources(items) {
  const sources = new Set();
  for (const item of items) {
    const meta = item.meta || {};
    const listed = Array.isArray(meta.assets) ? meta.assets : [];
    let assets = [];
    if (item.type === "gallery") {
      assets = [meta.image, ...listed].filter(Boolean).map((asset) => resolveAsset(item, asset));
    } else if (item.type === "novel" && item.topLevel) {
      // Explicit cover/image wins; otherwise use the same cover.<extension> fallback as the app.
      const cover = meta.cover || meta.image;
      assets = cover ? [resolveAsset(item, cover)] : [listed.map((asset) => resolveAsset(item, asset))
        .find((asset) => /(^|\/)cover\.[^.]+$/i.test(asset)) || ""];
    }
    for (const asset of assets) {
      if (!/\.(jpe?g|png|webp)$/i.test(asset)) continue;
      const normalized = path.posix.normalize(asset);
      if (normalized.startsWith("../") || path.posix.isAbsolute(normalized)) {
        throw new Error(`Preview source must stay inside the project: ${asset}`);
      }
      sources.add(normalized);
    }
  }
  return [...sources].sort();
}

function targetWidths(width) {
  return [...new Set(settings.widths.map((value) => Math.min(value, width)))];
}

function variantPath(sourceHash, width) {
  return `assets/previews/${hash(`${sourceHash}:${settingsHash}`).slice(0, 24)}-${width}.webp`;
}

// The check command deliberately uses only Node built-ins. Read WebP dimensions
// and the ICC chunk directly, so verifying committed assets needs no native module.
function inspectWebp(bytes) {
  if (bytes.length < 20 || bytes.toString("ascii", 0, 4) !== "RIFF" ||
      bytes.toString("ascii", 8, 12) !== "WEBP" || bytes.readUInt32LE(4) + 8 !== bytes.length) {
    throw new Error("Invalid WebP container");
  }
  let width;
  let height;
  let iccHash = null;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const type = bytes.toString("ascii", offset, offset + 4);
    const length = bytes.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (start + length > bytes.length) throw new Error("Truncated WebP chunk");
    if (type === "VP8X" && length >= 10) {
      width = bytes.readUIntLE(start + 4, 3) + 1;
      height = bytes.readUIntLE(start + 7, 3) + 1;
    } else if (type === "VP8 " && !width && length >= 10 && bytes.toString("hex", start + 3, start + 6) === "9d012a") {
      width = bytes.readUInt16LE(start + 6) & 0x3fff;
      height = bytes.readUInt16LE(start + 8) & 0x3fff;
    } else if (type === "ICCP") {
      iccHash = hash(bytes.subarray(start, start + length));
    }
    offset = start + length + (length % 2);
  }
  if (!width || !height) throw new Error("WebP dimensions are missing");
  return { width, height, iccHash };
}

function validateEntry(source, sourceHash, entry) {
  if (!entry || entry.sourceHash !== sourceHash) throw new Error(`${source}: source hash changed or preview is missing`);
  if (!Number.isInteger(entry.width) || !Number.isInteger(entry.height) || entry.width < 1 || entry.height < 1) {
    throw new Error(`${source}: invalid original dimensions`);
  }
  const widths = targetWidths(entry.width);
  if (!Array.isArray(entry.variants) || entry.variants.length !== widths.length) {
    throw new Error(`${source}: preview sizes are out of date`);
  }
  entry.variants.forEach((variant, index) => {
    const width = widths[index];
    const expectedPath = variantPath(sourceHash, width);
    // libvips can round the scaled height by one pixel during JPEG shrink-on-load.
    if (variant.src !== expectedPath || variant.width !== width || !Number.isInteger(variant.height) ||
        variant.height < 1 || Math.abs(variant.height - Math.max(1, Math.round(entry.height * width / entry.width))) > 1) {
      throw new Error(`${source}: preview dimensions or filename are out of date`);
    }
    const bytes = fs.readFileSync(path.join(root, expectedPath));
    if (variant.bytes !== bytes.length || variant.fileHash !== hash(bytes)) {
      throw new Error(`${expectedPath}: preview bytes do not match the manifest`);
    }
    const actual = inspectWebp(bytes);
    if (actual.width !== variant.width || actual.height !== variant.height || actual.iccHash !== entry.iccHash) {
      throw new Error(`${expectedPath}: preview dimensions or color profile do not match`);
    }
  });
}

async function buildEntry(sharp, source, sourceHash) {
  const sourcePath = path.join(root, source);
  const metadata = await sharp(sourcePath).metadata();
  if (metadata.pages > 1) throw new Error(`${source}: animated images require a separate preview policy`);
  const swapped = [5, 6, 7, 8].includes(metadata.orientation);
  const width = swapped ? metadata.height : metadata.width;
  const height = swapped ? metadata.width : metadata.height;
  const entry = { width, height, sourceHash, iccHash: metadata.icc ? hash(metadata.icc) : null, variants: [] };
  for (const targetWidth of targetWidths(width)) {
    // A width-only resize preserves the complete composition and aspect ratio.
    // Orientation is baked into pixels; no EXIF location or other private metadata is copied.
    const bytes = await sharp(sourcePath)
      .rotate()
      .resize({ width: targetWidth, withoutEnlargement: true, fastShrinkOnLoad: settings.fastShrinkOnLoad })
      .keepIccProfile()
      .webp({ quality: settings.quality, effort: settings.effort, alphaQuality: settings.alphaQuality })
      .toBuffer();
    const dimensions = inspectWebp(bytes);
    const src = variantPath(sourceHash, targetWidth);
    fs.writeFileSync(path.join(root, src), bytes);
    entry.variants.push({ src, width: dimensions.width, height: dimensions.height, bytes: bytes.length, fileHash: hash(bytes) });
  }
  validateEntry(source, sourceHash, entry);
  return entry;
}

async function main() {
  const content = readGlobal(path.join(root, "content-index.js"), "CONTENT_INDEX");
  if (!Array.isArray(content?.items)) throw new Error("Invalid content index; run npm run build:content");
  const sources = collectSources(content.items);
  let previous;
  if (fs.existsSync(outputPath)) previous = readGlobal(outputPath, "IMAGE_PREVIEWS");
  const reusable = previous?.version === 1 && previous.settingsHash === settingsHash &&
    JSON.stringify(previous.settings) === JSON.stringify(settings);
  if (checkOnly && !reusable) throw new Error("Preview manifest or build settings are out of date");
  const images = {};
  let sharp;
  let generated = 0;
  if (!checkOnly) fs.mkdirSync(previewDirectory, { recursive: true });
  for (const source of sources) {
    const sourceHash = hash(fs.readFileSync(path.join(root, source)));
    const entry = reusable ? previous.images?.[source] : undefined;
    try {
      validateEntry(source, sourceHash, entry);
      images[source] = entry;
    } catch (error) {
      if (checkOnly) throw error;
      if (!sharp) sharp = require("sharp");
      images[source] = await buildEntry(sharp, source, sourceHash);
      generated += 1;
    }
    if (hash(fs.readFileSync(path.join(root, source))) !== sourceHash) {
      throw new Error(`${source}: original changed during preview generation`);
    }
  }
  const activeFiles = new Set(Object.values(images).flatMap((entry) => entry.variants.map((variant) => path.basename(variant.src))));
  const orphanedFiles = fs.existsSync(previewDirectory) ? fs.readdirSync(previewDirectory)
    .filter((file) => /^[a-f0-9]{24}-\d+\.webp$/.test(file) && !activeFiles.has(file)) : [];
  const payload = { version: 1, settings, settingsHash, images };
  const output = `// Generated by scripts/build-image-previews.js. Do not edit by hand.\nwindow.IMAGE_PREVIEWS = ${JSON.stringify(payload, null, 2)};\n`;
  if (checkOnly) {
    if (fs.readFileSync(outputPath, "utf8") !== output || orphanedFiles.length) throw new Error("Preview manifest or generated files are out of date");
    console.log(`Image previews checked: ${sources.length} originals, ${activeFiles.size} WebP files; source hashes, settings, bytes, dimensions and ICC profiles match.`);
    return;
  }
  fs.writeFileSync(outputPath, output);
  for (const file of orphanedFiles) fs.unlinkSync(path.join(previewDirectory, file));
  console.log(`Image previews built: ${sources.length} originals, ${activeFiles.size} WebP files (${generated} originals regenerated). Original files were not modified.`);
}

main().catch((error) => {
  console.error(`Image preview ${checkOnly ? "check" : "build"} failed: ${error.message}`);
  if (checkOnly) console.error("Run: npm run build:images");
  process.exitCode = 1;
});
