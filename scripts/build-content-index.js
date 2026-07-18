const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const contentRoot = path.join(root, "content");
const outputPath = path.join(root, "content-index.js");
const projectAssetExtensions = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg", ".mov", ".mp4", ".webm"]);
const identityImageExtensions = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg"]);

function walkMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkMarkdownFiles(fullPath);
    if (entry.isFile() && entry.name.endsWith(".md")) return [fullPath];
    return [];
  });
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return trimmed.replace(/^["']|["']$/g, "");
}

function parseFrontmatter(source) {
  const normalized = source.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return { data: {}, body: normalized.trim() };
  }

  const end = normalized.indexOf("\n---", 4);
  if (end === -1) return { data: {}, body: normalized.trim() };

  const raw = normalized.slice(4, end).trim();
  const body = normalized.slice(end + 4).trim();
  const data = {};
  let activeKey = null;

  raw.split("\n").forEach((line) => {
    if (/^\s+-\s+/.test(line) && activeKey) {
      data[activeKey].push(parseScalar(line.replace(/^\s+-\s+/, "")));
      return;
    }

    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (!match) return;

    const key = match[1].trim();
    const value = match[2].trim();
    activeKey = null;

    if (value === "") {
      data[key] = [];
      activeKey = key;
    } else {
      data[key] = parseScalar(value);
    }
  });

  return { data, body };
}

function parseLanguageBodies(body) {
  const normalized = body.replace(/\r\n/g, "\n").trim();
  const markerPattern = /<!--\s*(ko|en)\s*-->/gi;
  const matches = [...normalized.matchAll(markerPattern)];

  if (matches.length === 0) {
    return {
      ko: normalized,
      en: "",
    };
  }

  const bodies = { ko: "", en: "" };

  matches.forEach((match, index) => {
    const lang = match[1].toLowerCase();
    const start = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? normalized.length;
    bodies[lang] = normalized.slice(start, end).trim();
  });

  return bodies;
}

function normalizeId(filePath) {
  return path
    .relative(contentRoot, filePath)
    .replace(/\\/g, "/")
    .replace(/\.md$/, "");
}

function inferType(filePath, data) {
  if (data.type) return data.type;
  return path.relative(contentRoot, path.dirname(filePath)).split(path.sep)[0] || "writing";
}

function discoverProjectAssets(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && projectAssetExtensions.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
}

function formatIdentityImageLabel(filename) {
  const base = path.basename(filename, path.extname(filename)).trim();
  if (!base) return "";
  const label = base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (label.startsWith("@")) return label;
  return `@${label.toUpperCase()}`;
}

function parseIdentityCaptionEntry(entry) {
  const parts = String(entry)
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  const filename = parts[0];
  const labelKo = parts[1] || formatIdentityImageLabel(filename);
  const labelEn = parts[2] || labelKo;

  return {
    filename,
    labelKo,
    labelEn,
  };
}

function getIdentityCaptionMap(data) {
  const entries = normalizeList(data.identityImageCaptions || data.residentImageCaptions);
  const captionMap = new Map();

  entries
    .map(parseIdentityCaptionEntry)
    .filter(Boolean)
    .forEach((entry) => {
      captionMap.set(entry.filename, entry);
      captionMap.set(path.basename(entry.filename, path.extname(entry.filename)), entry);
    });

  return captionMap;
}

function discoverIdentityImages(filePath, data) {
  const dirName = data.identityImagesDir || data.residentImagesDir;
  if (!dirName) return [];

  const sourceDir = path.resolve(path.dirname(filePath), dirName);
  if (!fs.existsSync(sourceDir)) return [];

  const captionMap = getIdentityCaptionMap(data);

  return fs
    .readdirSync(sourceDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && identityImageExtensions.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => {
      const fullPath = path.join(sourceDir, entry.name);
      const fallbackLabel = formatIdentityImageLabel(entry.name);
      const caption = captionMap.get(entry.name) || captionMap.get(path.basename(entry.name, path.extname(entry.name)));
      return {
        src: path.relative(root, fullPath).replace(/\\/g, "/"),
        label: caption?.labelEn || caption?.labelKo || fallbackLabel,
        labelKo: caption?.labelKo || fallbackLabel,
        labelEn: caption?.labelEn || caption?.labelKo || fallbackLabel,
      };
    })
    .sort((a, b) => a.src.localeCompare(b.src, undefined, { numeric: true, sensitivity: "base" }));
}

function normalizeList(value) {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function inferTopLevel(filePath, data, type) {
  if (data.topLevel !== undefined) return data.topLevel !== false;

  const relativePath = path.relative(contentRoot, filePath).replace(/\\/g, "/");
  const isNestedProjectFile = relativePath.split("/").length > 3;
  if (type === "novel" && path.basename(filePath) !== "index.md") return false;
  if (type === "novel" && isNestedProjectFile) return false;
  return true;
}

function withProjectAssets(filePath, data, type) {
  if (type === "role") {
    const residentImages = discoverIdentityImages(filePath, data);
    if (residentImages.length === 0) return data;
    return {
      ...data,
      residentImages,
    };
  }

  if (!["gallery", "novel"].includes(type)) return data;

  const next = { ...data };
  const listedAssets = normalizeList(next.assets);
  if (listedAssets.length > 0) {
    next.assets = listedAssets;
    if (type === "novel" && !next.cover) {
      next.cover = listedAssets.find((asset) => /^cover\./i.test(asset)) || "";
    }
    return next;
  }

  const discoveredAssets = discoverProjectAssets(filePath);
  if (discoveredAssets.length === 0) return data;

  next.assets = discoveredAssets;

  if (type === "novel" && !next.cover) {
    next.cover = discoveredAssets.find((asset) => /^cover\./i.test(asset)) || "";
  }

  return next;
}

const items = walkMarkdownFiles(contentRoot)
  .map((filePath) => {
    const source = fs.readFileSync(filePath, "utf8");
    const { data, body } = parseFrontmatter(source);
    const bodies = parseLanguageBodies(body);
    const type = inferType(filePath, data);
    const meta = withProjectAssets(filePath, data, type);
    const id = data.id || normalizeId(filePath);
    const titleKo = data.titleKo || data.title || path.basename(filePath, ".md");
    const titleEn = data.titleEn || "";

    return {
      id,
      type,
      title: titleKo,
      titleKo,
      titleEn,
      order: data.order ?? 9999,
      topLevel: inferTopLevel(filePath, data, type),
      path: path.relative(root, filePath).replace(/\\/g, "/"),
      meta,
      markdown: bodies.ko || bodies.en,
      markdownKo: bodies.ko,
      markdownEn: bodies.en,
    };
  })
  .sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    if (a.order !== b.order) return a.order - b.order;
    return a.title.localeCompare(b.title);
  });

const payload = {
  generatedAt: "content-index",
  items,
};

const output = `// Generated by scripts/build-content-index.js. Do not edit by hand.\nwindow.CONTENT_INDEX = ${JSON.stringify(payload, null, 2)};\n`;

if (process.argv.includes("--check")) {
  const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  if (current !== output) {
    console.error(`${path.relative(root, outputPath)} is out of date. Run: npm run build:content`);
    process.exit(1);
  }
  console.log(`${path.relative(root, outputPath)} is up to date.`);
} else {
  fs.writeFileSync(outputPath, output, "utf8");
  console.log(`Generated ${path.relative(root, outputPath)} with ${items.length} item(s).`);
}
