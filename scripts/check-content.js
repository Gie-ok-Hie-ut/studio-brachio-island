const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const indexPath = path.join(root, "content-index.js");
const allowedTypes = new Set(["essay", "gallery", "novel", "role"]);
const novelBodyAccessValues = new Set(["public", "excerpt", "withheld"]);
const assetKeys = ["image", "cover"];

function loadContentIndex() {
  const source = fs.readFileSync(indexPath, "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { filename: indexPath });
  return sandbox.window.CONTENT_INDEX;
}

function isExternal(value = "") {
  return /^(https?:|mailto:|tel:|#|notion:)/i.test(String(value).trim());
}

function projectFilePath(value = "") {
  if (!value || isExternal(value)) return "";
  const clean = String(value).trim().replace(/^\/+/, "").replace(/^(\.\.\/)+/, "");
  return path.join(root, clean);
}

function contentRelativePath(href = "", itemPath = "") {
  const clean = String(href).trim().replace(/^chapter:/i, "").split("#")[0];
  if (!clean || isExternal(clean)) return "";
  if (clean.startsWith("/")) return clean.replace(/^\/+/, "");
  if (clean.startsWith("content/")) return clean;

  const stack = itemPath.split("/").filter(Boolean);
  stack.pop();
  clean.split("/").forEach((part) => {
    if (!part || part === ".") return;
    if (part === "..") stack.pop();
    else stack.push(part);
  });
  return stack.join("/");
}

function itemLocalFile(item, value = "") {
  if (!value || isExternal(value)) return "";
  if (String(value).startsWith("content/")) return path.join(root, value);
  return path.join(root, path.dirname(item.path), value);
}

function checkFile(errors, label, filePath) {
  if (!filePath || fs.existsSync(filePath)) return;
  errors.push(`${label} not found: ${path.relative(root, filePath)}`);
}

function markdownLinks(markdown = "") {
  const links = [];
  const pattern = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
  let match;
  while ((match = pattern.exec(markdown))) {
    links.push(match[1]);
  }
  return links;
}

function getMarkdownSectionRows(markdown = "", sectionTitle = "") {
  const normalized = String(markdown || "").replace(/\r\n/g, "\n");
  const rows = [];
  let active = false;
  let pendingHeader = false;
  let inTable = false;

  normalized.split("\n").forEach((rawLine) => {
    const line = rawLine.trim();
    if (line.startsWith("## ")) {
      active = line.slice(3).trim().toLowerCase() === sectionTitle.toLowerCase();
      pendingHeader = false;
      inTable = false;
      return;
    }
    if (!active || !line) return;
    if (line.startsWith("|")) {
      const cells = line
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim());
      if (!pendingHeader && !inTable) {
        pendingHeader = cells.length >= 3;
        return;
      }
      const isDivider = cells.length >= 3 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s+/g, "")));
      if (pendingHeader && isDivider) {
        inTable = true;
        pendingHeader = false;
        return;
      }
      if (inTable && cells.length >= 3 && cells[0] && cells[1] && cells[2]) rows.push(line);
      return;
    }
    if (!/^[-*]\s+/.test(line)) return;
    const clean = line.replace(/^[-*]\s+/, "");
    const parts = clean.split("|").map((part) => part.trim());
    if (parts.length >= 3 && parts[0] && parts[1] && parts[2]) rows.push(clean);
  });

  return rows;
}

function checkEngineerCvSource(errors, item) {
  if (item.type !== "role" || item.meta?.roleId !== "engineer") return;

  ["markdownKo", "markdownEn"].forEach((key) => {
    const markdown = item[key] || "";
    ["Projects", "Paper"].forEach((sectionTitle) => {
      const rows = getMarkdownSectionRows(markdown, sectionTitle);
      if (rows.length === 0) {
        errors.push(`${item.id} ${key} section "${sectionTitle}" must contain explicit markdown table rows.`);
      }
    });
  });
}

function checkNovelBodyAccess(errors, item) {
  if (item.type !== "novel") return;

  const bodyAccess = String(item.meta?.bodyAccess || "").trim();
  const hasBody = Boolean(String(item.markdownKo || "").trim() || String(item.markdownEn || "").trim());

  if (!novelBodyAccessValues.has(bodyAccess)) {
    errors.push(`${item.id} must define bodyAccess as public, excerpt, or withheld.`);
    return;
  }
  if (bodyAccess === "withheld" && hasBody) {
    errors.push(`${item.id} is withheld but its generated content still contains body text.`);
  }
  if (bodyAccess !== "public" && (item.meta?.source || item.meta?.sourceUrl)) {
    errors.push(`${item.id} cannot expose source or sourceUrl unless bodyAccess is public.`);
  }
  if (bodyAccess !== "withheld" && !hasBody) {
    errors.push(`${item.id} uses bodyAccess: ${bodyAccess} but has no public body text.`);
  }
}

function checkNovelAccessCopy(errors, item) {
  if (item.type !== "role" || item.meta?.roleId !== "novel") return;

  ["withheldNoticeKo", "withheldNoticeEn", "withheldCtaKo", "withheldCtaEn"].forEach((key) => {
    if (!String(item.meta?.[key] || "").trim()) errors.push(`${item.id} is missing ${key}.`);
  });

  const email = String(item.meta?.withheldContactEmail || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push(`${item.id} must define a valid withheldContactEmail.`);
  }
}

function checkContent() {
  const payload = loadContentIndex();
  const items = payload?.items || [];
  const errors = [];
  const ids = new Map();

  items.forEach((item) => {
    if (!item.id) errors.push(`Missing id for ${item.path || item.title}`);
    if (ids.has(item.id)) errors.push(`Duplicate id "${item.id}" in ${ids.get(item.id)} and ${item.path}`);
    ids.set(item.id, item.path);

    if (!allowedTypes.has(item.type)) errors.push(`${item.id} has unknown type "${item.type}"`);
    checkFile(errors, `${item.id} markdown`, path.join(root, item.path));

    assetKeys.forEach((key) => {
      const value = item.meta?.[key];
      if (!value) return;
      const filePath = item.type === "role" ? projectFilePath(value) : itemLocalFile(item, value);
      checkFile(errors, `${item.id} ${key}`, filePath);
    });

    if (Array.isArray(item.meta?.assets)) {
      item.meta.assets.forEach((asset) => {
        checkFile(errors, `${item.id} asset "${asset}"`, itemLocalFile(item, asset));
      });
    }

    if (Array.isArray(item.meta?.residentImages)) {
      item.meta.residentImages.forEach((image) => {
        checkFile(errors, `${item.id} resident image "${image.src}"`, projectFilePath(image.src));
      });
    }

    if (item.meta?.pdf && !isExternal(item.meta.pdf)) {
      checkFile(errors, `${item.id} pdf`, projectFilePath(item.meta.pdf));
    }

    const markdown = [item.markdownKo, item.markdownEn].filter(Boolean).join("\n");
    checkEngineerCvSource(errors, item);
    checkNovelBodyAccess(errors, item);
    checkNovelAccessCopy(errors, item);

    markdownLinks(markdown).forEach((href) => {
      const clean = String(href).replace(/^chapter:/i, "").split("#")[0];
      if (!clean || isExternal(clean) || !/\.md$/i.test(clean)) return;
      const resolved = contentRelativePath(clean, item.path);
      checkFile(errors, `${item.id} markdown link "${href}"`, path.join(root, resolved));
    });
  });

  if (errors.length > 0) {
    console.error(`Content validation failed with ${errors.length} issue(s):`);
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log(`Content validation passed for ${items.length} item(s).`);
}

checkContent();
