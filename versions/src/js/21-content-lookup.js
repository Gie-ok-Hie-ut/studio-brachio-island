/* Content lookup, path resolution, and localized content helpers. */
function normalizeNotionId(value = "") {
  const compact = value.replace(/-/g, "");
  const match = compact.match(/[0-9a-f]{32}/i);
  if (!match) return "";
  return match[0].replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
}

function findContentById(id) {
  return contentItems.find((item) => item.id === id) || null;
}

function findContentByPath(path = "") {
  const clean = String(path).trim().replace(/^\/+/, "");
  return contentItems.find((item) => item.path === clean) || null;
}

function findContentByHref(href) {
  const targetId = normalizeNotionId(href);
  if (!targetId) return null;
  return contentItems.find((item) => item.id === targetId || normalizeNotionId(item.meta?.sourceUrl || "") === targetId) || null;
}

function resolveContentRelativePath(href = "", context = {}) {
  const clean = String(href).trim().replace(/^chapter:/i, "").split("#")[0];
  if (!clean) return "";
  if (/^(https?:|mailto:|tel:|#|notion:)/i.test(clean)) return "";
  if (clean.startsWith("/")) return clean.replace(/^\/+/, "");
  if (clean.startsWith("content/")) return clean;

  const basePath = context.basePath || context.item?.path || "";
  if (!basePath) return clean;

  const stack = basePath.split("/").filter(Boolean);
  stack.pop();
  clean.split("/").forEach((part) => {
    if (!part || part === ".") return;
    if (part === "..") stack.pop();
    else stack.push(part);
  });
  return stack.join("/");
}

function isMarkdownHref(href = "") {
  const clean = String(href).trim().replace(/^chapter:/i, "").split("#")[0];
  return /^chapter:/i.test(String(href).trim()) || /\.md$/i.test(clean);
}

function findContentByMarkdownHref(href, context = {}) {
  const resolved = resolveContentRelativePath(href, context);
  if (!resolved) return null;

  const candidates = [resolved];
  if (!/\.md$/i.test(resolved)) {
    candidates.push(`${resolved}.md`);
    candidates.push(`${resolved}/index.md`);
  }

  return contentItems.find((item) => candidates.includes(item.path)) || null;
}

function resolveMarkdownAssetHref(href = "", context = {}) {
  if (/^(https?:|mailto:|tel:|#|notion:)/i.test(href)) return href;
  return projectHref(resolveContentRelativePath(href, context) || href);
}

function getLocalizedTitle(item, lang = getSiteLanguage()) {
  if (!item) return "";
  if (lang === "en") return item.titleEn || item.titleKo || item.title;
  return item.titleKo || item.title || item.titleEn;
}

function getLocalizedMarkdown(item, lang = getSiteLanguage()) {
  if (!item) return "";
  if (lang === "en") return item.markdownEn || item.markdownKo || item.markdown || "";
  return item.markdownKo || item.markdown || item.markdownEn || "";
}

function getNovelBodyAccess(item) {
  if (item?.type !== "novel") return "public";
  const bodyAccess = String(item.meta?.bodyAccess || "").trim();
  return ["public", "excerpt", "withheld"].includes(bodyAccess) ? bodyAccess : "withheld";
}

function getNovelWithheldCopy(lang = getSiteLanguage()) {
  const roleItem = contentItems.find((item) => item.type === "role" && item.meta?.roleId === "novel");
  const meta = roleItem?.meta || {};
  const targetLang = lang === "ko" ? "ko" : "en";

  return {
    notice: targetLang === "ko" ? meta.withheldNoticeKo : meta.withheldNoticeEn,
    cta: targetLang === "ko" ? meta.withheldCtaKo : meta.withheldCtaEn,
    email: meta.withheldContactEmail || "",
  };
}

function hasLocalizedMarkdown(item, lang) {
  if (!item) return false;
  const markdown = lang === "en" ? item.markdownEn : item.markdownKo || item.markdown;
  return Boolean(String(markdown || "").trim());
}

function getDefaultReaderLanguage(item, preferredLang = getSiteLanguage()) {
  const preferred = preferredLang === "ko" ? "ko" : "en";
  if (hasLocalizedMarkdown(item, preferred)) return preferred;
  if (hasLocalizedMarkdown(item, "en")) return "en";
  if (hasLocalizedMarkdown(item, "ko")) return "ko";
  return preferred;
}

function prepareReaderLanguage(item, options = {}) {
  const preferred = options.preserveLanguage ? getReaderLanguage() : getSiteLanguage();
  setActiveReaderLanguage(getDefaultReaderLanguage(item, preferred));
  applyReaderSettings({ persist: false });
}
