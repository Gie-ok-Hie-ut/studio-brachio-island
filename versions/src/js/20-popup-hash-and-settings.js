  if (!path) return "";
  if (/^(https?:|mailto:|tel:|#)/i.test(path)) return path;
  return `${projectRoot}${String(path).replace(/^\.\.\//, "")}`;
}

function getContentAnchorId(itemOrId) {
  const rawId = typeof itemOrId === "string" ? itemOrId : itemOrId?.id || "";
  return `item-${String(rawId).replace(/[^a-z0-9_-]+/gi, "-")}`;
}

function getPopupHashState(hash = window.location.hash) {
  const rawHash = String(hash || "").replace(/^#/, "");
  if (!rawHash || rawHash === "explore" || rawHash.startsWith("item-")) return null;

  const params = new URLSearchParams(rawHash);
  if (params.has("gallery")) {
    return {
      type: "gallery",
      id: params.get("gallery") || "",
      asset: Number(params.get("asset") || 0),
    };
  }
  if (params.has("reader")) {
    return {
      type: "content",
      id: params.get("reader") || "",
    };
  }
  if (params.has("pdf")) {
    return {
      type: "pdf",
      id: params.get("pdf") || "",
    };
  }
  if (params.has("chapter")) {
    return {
      type: "chapter",
      path: params.get("chapter") || "",
      parentId: params.get("parent") || "",
      title: params.get("title") || "",
    };
  }
  return null;
}

function getChapterTitleFromPath(path = "") {
  const filename = String(path).split("/").filter(Boolean).pop() || "";
  return filename.replace(/\.md$/i, "") || "Chapter";
}

function buildPopupHash(snapshot = currentReader) {
  if (!snapshot?.type) return "";
  const params = new URLSearchParams();

  if (snapshot.type === "gallery" && snapshot.id) {
    params.set("gallery", snapshot.id);
    params.set("asset", String(currentGalleryProject.index || 0));
    return params.toString();
  }

  if (snapshot.type === "content" && snapshot.id) {
    params.set("reader", snapshot.id);
    return params.toString();
  }

  if (snapshot.type === "pdf" && snapshot.id && findContentById(snapshot.id)?.meta?.pdf) {
    params.set("pdf", snapshot.id);
    return params.toString();
  }

  if (snapshot.type === "chapter" && snapshot.path) {
    params.set("chapter", snapshot.path);
    if (snapshot.parentId) params.set("parent", snapshot.parentId);
    if (snapshot.title) params.set("title", snapshot.title);
    return params.toString();
  }

  return "";
}

function updatePopupHash(options = {}) {
  if (isApplyingPopupHash) return;
  const hash = buildPopupHash();
  if (!hash || window.location.hash === `#${hash}`) return;
  const method = options.replace ? "replaceState" : "pushState";
  window.history[method](null, "", `#${hash}`);
}

function clearPopupHash(options = {}) {
  if (isApplyingPopupHash || !getPopupHashState()) return;
  const method = options.replace ? "replaceState" : "pushState";
  window.history[method](null, "", `${window.location.pathname}${window.location.search}`);
}

function getCurrentPopupShareUrl() {
  const hash = buildPopupHash();
  const url = new URL(window.location.href);
  if (hash) url.hash = hash;
  return url.toString();
}

function getCurrentPopupShareTitle() {
  if (currentReader.type === "pdf" && pdfTitle?.textContent) return pdfTitle.textContent.trim();
  if (readerTitle?.textContent) return readerTitle.textContent.trim();
  return document.title || "Studio Brachio Island";
}

function copyTextWithFallback(text) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.left = "-9999px";
  document.body.append(textarea);
  textarea.select();

  try {
    document.execCommand("copy");
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  } finally {
    textarea.remove();
  }
}

function setPopupShareFeedback(control, state = "") {
  if (!control) return;
  window.clearTimeout(Number(control.dataset.feedbackTimer || 0));
  control.dataset.shareState = state;
  if (state) {
    const timer = window.setTimeout(() => {
      control.dataset.shareState = "";
      control.dataset.feedbackTimer = "";
    }, 1300);
    control.dataset.feedbackTimer = String(timer);
  }
}

async function shareCurrentPopup(event) {
  event?.preventDefault();
  const control = event?.currentTarget;
  const hasOpenReader = readerModal?.classList.contains("is-open");
  const hasOpenPdf = pdfModal?.classList.contains("is-open");
  if (!hasOpenReader && !hasOpenPdf) return;

  if (!getPopupHashState()) updatePopupHash({ replace: true });
  const url = getCurrentPopupShareUrl();
  const title = getCurrentPopupShareTitle();
  const canUseNativeShare = Boolean(navigator.share) && window.matchMedia("(max-width: 900px), (pointer: coarse)").matches;

  if (canUseNativeShare) {
    try {
      await navigator.share({ title, url });
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
  }

  try {
    await copyTextWithFallback(url);
    setPopupShareFeedback(control, "copied");
  } catch (error) {
    setPopupShareFeedback(control, "error");
  }
}

function openPopupFromHashState(state) {
  if (!state) return false;

  if (state.type === "gallery") {
    const item = findContentById(state.id);
    if (!item || item.type !== "gallery") return false;
    openGalleryProject(item, Number.isFinite(state.asset) ? state.asset : 0, {
      preserveLanguage: true,
      skipUrl: true,
    });
    return true;
  }

  if (state.type === "content") {
    const item = findContentById(state.id);
    if (!item) return false;
    renderMarkdownReader(item.id, true, {
      preserveLanguage: true,
      skipUrl: true,
    });
    return true;
  }

  if (state.type === "pdf") {
    const item = findContentById(state.id);
    if (!item || !item.meta?.pdf) return false;
    renderPdfReader(item.id, { skipUrl: true });
    return true;
  }

  if (state.type === "chapter") {
    if (!state.path) return false;
    const parentItem = findContentById(state.parentId);
    renderMarkdownFileReader(
      state.path,
      state.title || getChapterTitleFromPath(state.path),
      parentItem,
      true,
      {
        preserveLanguage: true,
        skipUrl: true,
      }
    );
    return true;
  }

  return false;
}

function syncPopupFromUrl() {
  const state = getPopupHashState();
  const hasOpenReader = readerModal?.classList.contains("is-open");
  const hasOpenPdf = pdfModal?.classList.contains("is-open");

  if (!state) {
    if (!hasOpenReader && !hasOpenPdf) return false;
    isApplyingPopupHash = true;
    try {
      closeReader({ preserveUrl: true });
      closePdf({ preserveUrl: true });
    } finally {
      isApplyingPopupHash = false;
    }
    return false;
  }

  isApplyingPopupHash = true;
  try {
    return openPopupFromHashState(state);
  } finally {
    isApplyingPopupHash = false;
  }
}

const defaultReaderSettings = {
  lang: "en",
  size: "medium",
  spacing: "normal",
  theme: "light",
};
function getSavedReaderSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("readerSettings") || "{}");
    if (!localStorage.getItem("siteLanguage")) {
      delete saved.lang;
    }
    saved.theme = "light";
    return saved;
  } catch {
    return {};
  }
}

function saveReaderSettings() {
  try {
    localStorage.setItem("readerSettings", JSON.stringify(readerSettings));
    localStorage.setItem("siteLanguage", readerSettings.lang);
  } catch {
    // Ignore storage errors in local file previews or private browsing.
  }
}

const readerSettings = {
  ...defaultReaderSettings,
  ...getSavedReaderSettings(),
};
let activeReaderLanguage = "";
let currentReader = {
  type: "",
  id: "",
};
let readerHistory = [];
let currentGalleryProject = {
  item: null,
  index: 0,
};
let galleryOriginalModal = null;
let galleryOriginalMedia = null;
let roleReadyTimer = 0;
let galleryMasonryColumnCount = 0;
let isApplyingPopupHash = false;

const staticCopy = {
  "#reader-title": { en: "Select a text", ko: "글을 선택하세요" },
  "#pdf-title": { en: "Select a PDF", ko: "PDF를 선택하세요" },
};

function applyStaticCopy() {
  const lang = getSiteLanguage();
  document.documentElement.lang = lang;
  Object.entries(staticCopy).forEach(([selector, copy]) => {
    if (selector === "#reader-title" && currentReader.type) return;
    if (selector === "#pdf-title" && currentReader.type === "pdf") return;
    const element = document.querySelector(selector);
    if (!element) return;
    if (copy[lang].includes("<")) {
      element.innerHTML = copy[lang];
    } else {
      element.textContent = copy[lang];
    }
  });
  languageControls.forEach((control) => {
    control.classList.toggle("is-active", control.dataset.language === lang);
  });
}

function refreshLocalizedContent(options = {}) {
  const scrollState = options.preserveReaderScroll
    ? options.scrollState || getReaderScrollState()
    : null;
  applyStaticCopy();
  renderRoleShells();
  renderRoleItems();
  bindNovelViewControls();
  if (currentReader.type === "content") {
    renderMarkdownReader(currentReader.id, false, {
      preserveLanguage: true,
      scrollState,
    });
  }
  if (currentReader.type === "chapter") {
    renderMarkdownFileReader(
      currentReader.path,
      currentReader.title,
      findContentById(currentReader.parentId),
      false,
      {
        preserveLanguage: true,
        scrollState,
      }
    );
  }
  if (currentReader.type === "gallery" && currentGalleryProject.item && readerModal?.classList.contains("is-open")) {
    openGalleryProject(currentGalleryProject.item, currentGalleryProject.index, {
      preserveLanguage: true,
      scrollState,
    });
  }
  if (currentReader.type === "pdf") {
    const item = findContentById(currentReader.id);
    if (item && pdfTitle) pdfTitle.textContent = getLocalizedTitle(item);
  }
  renderTodaysSignal();
  revealDeepLinkedContent();
}

function setReaderVariant(variant = "") {
  if (!readerWindow) return;
  readerWindow.classList.toggle("reader-window-gallery", variant === "gallery");
}

function setLanguage(lang) {
  const scrollState = getReaderScrollState();
  readerSettings.lang = lang === "ko" ? "ko" : "en";
  activeReaderLanguage = "";
  applyReaderSettings();
  refreshLocalizedContent({
    preserveReaderScroll: true,
    scrollState,
  });
}

function getSiteLanguage() {
  return readerSettings.lang === "ko" ? "ko" : "en";
}

function getReaderLanguage() {
  return activeReaderLanguage || getSiteLanguage();
}

function setActiveReaderLanguage(lang) {
  activeReaderLanguage = lang === "ko" ? "ko" : "en";
}

function normalizeNotionId(value = "") {
  const compact = value.replace(/-/g, "");
  const match = compact.match(/[0-9a-f]{32}/i);
  if (!match) return "";
  return match[0].replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
}

function findWritingByHref(href) {
  const targetId = normalizeNotionId(href);
  if (!targetId) return null;
  return writings.find((item) => item.id === targetId) || null;
}

function findContentById(id) {
  return contentItems.find((item) => item.id === id) || null;
}

function findWritingByContent(item) {
  const sourceUrl = item?.meta?.sourceUrl;
  const sourceId = sourceUrl ? normalizeNotionId(sourceUrl) : "";
  return writings.find((writing) => writing.id === item?.id || writing.id === sourceId) || null;
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

function getReaderScrollState() {
  if (!readerContent || !readerModal?.classList.contains("is-open")) return null;
  const max = Math.max(readerContent.scrollHeight - readerContent.clientHeight, 0);
  return {
    top: readerContent.scrollTop,
    ratio: max > 0 ? readerContent.scrollTop / max : 0,
  };
}

function restoreReaderScrollState(state) {
  if (!state || !readerContent) return;
  window.requestAnimationFrame(() => {
    const max = Math.max(readerContent.scrollHeight - readerContent.clientHeight, 0);
    const restoredTop = Math.min(max, Math.max(0, state.top));
    readerContent.scrollTop = Number.isFinite(restoredTop)
      ? restoredTop
      : Math.round(max * state.ratio);
    updateReaderScrollIndicator();
  });
}

function updateReaderScrollIndicator() {
  if (!readerContent || !readerWindow || !readerScrollIndicator || !readerScrollThumb) return;
  const maxScroll = Math.max(readerContent.scrollHeight - readerContent.clientHeight, 0);
  const hasScroll = maxScroll > 2;
  readerWindow.classList.toggle("has-reader-scroll", hasScroll);
  if (!hasScroll) {
    readerScrollThumb.style.height = "";
    readerScrollThumb.style.transform = "";
    return;
  }

  const trackHeight = Math.max(readerScrollIndicator.clientHeight, 1);
  const visibleRatio = clamp(readerContent.clientHeight / Math.max(readerContent.scrollHeight, 1));
  const thumbHeight = clamp(trackHeight * visibleRatio, 44, trackHeight);
  const thumbTravel = Math.max(trackHeight - thumbHeight, 0);
  const thumbTop = maxScroll > 0 ? (readerContent.scrollTop / maxScroll) * thumbTravel : 0;
  readerScrollThumb.style.height = `${thumbHeight.toFixed(2)}px`;
  readerScrollThumb.style.transform = `translateY(${thumbTop.toFixed(2)}px)`;
}

function scheduleReaderScrollIndicatorUpdate() {
  if (readerScrollIndicatorFrame) cancelAnimationFrame(readerScrollIndicatorFrame);
  readerScrollIndicatorFrame = requestAnimationFrame(() => {
    readerScrollIndicatorFrame = null;
    updateReaderScrollIndicator();
  });
}

function getLocalizedResidentLabel(entry = {}) {
  if (readerSettings.lang === "en") return entry.labelEn || entry.label || entry.labelKo || "";
  return entry.labelKo || entry.label || entry.labelEn || "";
}

function updateReaderBackState() {
  if (!readerBackControl) return;
  readerBackControl.disabled = readerHistory.length === 0;
  readerBackControl.setAttribute("aria-disabled", readerHistory.length === 0 ? "true" : "false");
}

function getReaderSnapshot() {
  if (!currentReader.type) return null;
  return { ...currentReader };
}

function pushReaderHistory() {
  const snapshot = getReaderSnapshot();
  if (!snapshot || snapshot.type === "pdf") return;
  readerHistory.push(snapshot);
  if (readerHistory.length > 24) readerHistory.shift();
  updateReaderBackState();
}

function restoreReaderSnapshot(snapshot) {
  if (!snapshot) return;
  if (snapshot.type === "content") {
    renderMarkdownReader(snapshot.id, false);
  } else if (snapshot.type === "chapter") {
    renderMarkdownFileReader(
      snapshot.path,
      snapshot.title,
      findContentById(snapshot.parentId),
      false
    );
  }
}

function goBackReader() {
  const snapshot = readerHistory.pop();
  updateReaderBackState();
  restoreReaderSnapshot(snapshot);
}

function openMarkdownReaderFromCurrent(id) {
  pushReaderHistory();
  renderMarkdownReader(id, true);
}

function openMarkdownFileReaderFromCurrent(path, title, parentItem = null) {
  pushReaderHistory();
  renderMarkdownFileReader(path, title, parentItem, true);
}

function renderInlinePart(part) {
  const internalWriting = part.href ? findWritingByHref(part.href) : null;
  const wrapper = part.href ? document.createElement(internalWriting ? "button" : "a") : document.createElement("span");
  if (part.href) {
    if (internalWriting) {
      wrapper.type = "button";
      wrapper.addEventListener("click", () => renderReader(internalWriting.id, true));
    } else {
      wrapper.href = part.href;
      wrapper.target = "_blank";
      wrapper.rel = "noreferrer";
    }
  }

  (part.text || "").split("\n").forEach((line, index) => {
    if (index > 0) wrapper.append(document.createElement("br"));
    wrapper.append(document.createTextNode(line));
  });

  (part.marks || []).forEach((mark) => {
    if (mark === "b") wrapper.classList.add("is-bold");
    if (mark === "i") wrapper.classList.add("is-italic");
    if (mark === "s") wrapper.classList.add("is-struck");
    if (mark === "c") wrapper.classList.add("is-code");
    if (mark.startsWith("h:")) wrapper.classList.add("is-highlighted");
  });

  return wrapper;
}

function renderMediaBlock(block) {
  const figure = document.createElement("figure");
  figure.className = `notion-media ${block.type}`;

  if (block.type === "video") {
    const iframe = document.createElement("iframe");
    iframe.src = block.src;
    iframe.title = block.caption || "Embedded video";
    iframe.loading = "lazy";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    figure.append(iframe);
  } else {
    const image = document.createElement("img");
    image.src = block.src;
    image.alt = block.caption || "Notion image";
    image.loading = "lazy";
    image.addEventListener("error", () => {
      figure.classList.add("is-unavailable");
    });
    figure.append(image);
  }

  const caption = document.createElement("figcaption");
  const source = document.createElement("a");
  caption.textContent = block.caption || block.type;
  if (block.originalSrc) {
    source.href = block.originalSrc;
    source.target = "_blank";
    source.rel = "noreferrer";
    source.textContent = " original";
    caption.append(source);
  }
  figure.append(caption);
  return figure;
}
