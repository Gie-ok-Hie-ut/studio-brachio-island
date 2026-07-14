const readerTitle = document.querySelector("#reader-title");
const readerSource = document.querySelector("#reader-source");
const readerContent = document.querySelector("#reader-content");
const readerModal = document.querySelector("#reader-modal");
const readerWindow = document.querySelector(".reader-window");
const pdfModal = document.querySelector("#pdf-modal");
const pdfTitle = document.querySelector("#pdf-title");
const pdfSource = document.querySelector("#pdf-source");
const pdfFrame = document.querySelector("#pdf-frame");
const readerLang = document.querySelector("#reader-lang");
const readerSize = document.querySelector("#reader-size");
const readerSpacing = document.querySelector("#reader-spacing");
const readerTheme = document.querySelector("#reader-theme");
const readerBackControl = document.querySelector("[data-reader-back]");
const closeReaderControls = document.querySelectorAll("[data-close-reader]");
const closePdfControls = document.querySelectorAll("[data-close-pdf]");
const v15MenuToggle = document.querySelector("[data-v15-menu-toggle]");
const v15RoleMenu = document.querySelector("#v15-role-menu");
const ROLE_FADE_MS = 760;
const ROLE_DETAIL_READY_MS = 360;
const introScreen = document.querySelector(".intro-screen");
const rolePanels = document.querySelectorAll("[data-role-panel]");
const activeRoleRoom = document.body.dataset.roleRoom || "";
const roleRoomTarget = document.querySelector("[data-role-room-target]");
const isRoleRoomPage = Boolean(activeRoleRoom);
const isArchivedVersionPage = !isRoleRoomPage && /\/versions\/[^/]+\.html$/i.test(window.location.pathname);
const projectRoot = isRoleRoomPage ? "../../" : isArchivedVersionPage ? "../" : "";
const roleRoomRoot = isRoleRoomPage ? "" : isArchivedVersionPage ? "rooms-v15/" : "versions/rooms-v15/";
const roleRoomPaths = {
  identity: `${roleRoomRoot}who-are-we.html`,
  engineer: `${roleRoomRoot}ai-research.html`,
  novel: `${roleRoomRoot}novel.html`,
  visual: `${roleRoomRoot}visual-art.html`,
  aesthetics: `${roleRoomRoot}essay.html`,
};
const galleryAssetFiles = [
  "IMG_9630.jpg",
  "2-8.jpg",
  "2-0.PNG",
  "2-1.PNG",
  "2-3.PNG",
  "2-2.PNG",
  "4-0.PNG",
  "2-6.jpg",
  "2-7.jpg",
  "2-5.jpg",
  "2-4.jpg",
  "6-0.JPG",
  "1-1.jpg",
  "1-0.PNG",
  "3-0.JPG",
  "7-0.PNG",
  "5-0.PNG",
  "IMG_5730.MOV",
];
const languageControls = document.querySelectorAll("[data-language]");
const writings = window.WRITING_DATA?.items || [];
const contentItems = window.CONTENT_INDEX?.items || [];
const novelItems = contentItems.filter((item) => item.type === "novel");
const galleryItems = contentItems.filter((item) => item.type === "gallery");
const essayItems = contentItems.filter((item) => item.type === "essay");
const paperItems = contentItems.filter((item) => item.type === "paper");
const roleItems = contentItems.filter((item) => item.type === "role");
const engineeringItems = contentItems.filter((item) => item.type === "engineering");
const topLevelNovelItems = novelItems.filter((item) => item.topLevel !== false);
const topLevelGalleryItems = galleryItems.filter((item) => item.topLevel !== false);
const topLevelEssayItems = essayItems.filter((item) => item.topLevel !== false);
const topLevelPaperItems = paperItems.filter((item) => item.topLevel !== false);
const topLevelEngineeringItems = engineeringItems.filter((item) => item.topLevel !== false);
const NOVEL_DEFAULT_VELOCITY = -0.14;
const NOVEL_HOVER_VELOCITY = Math.abs(NOVEL_DEFAULT_VELOCITY) * 8;
const NOVEL_SLOW_VELOCITY = -0.035;
const NOVEL_VELOCITY_EASE_MS = 1100;
const novelView = {
  mode: window.matchMedia("(max-width: 900px)").matches ? "grid" : "orbit",
};
const novelOrbit = {
  angle: 0,
  defaultVelocity: NOVEL_DEFAULT_VELOCITY,
  targetVelocity: NOVEL_DEFAULT_VELOCITY,
  velocity: NOVEL_DEFAULT_VELOCITY,
  frame: null,
  lastTime: 0,
  bound: false,
};

function clamp(value, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

function updateIntroScroll() {
  if (!introScreen) {
    document.documentElement.style.setProperty("--intro-title-opacity", "0");
    document.documentElement.style.setProperty("--header-opacity", "1");
    document.documentElement.style.setProperty("--role-page-opacity", "1");
    document.body.classList.add("is-header-visible");
    return;
  }
  const introHeight = Math.max(introScreen.offsetHeight, window.innerHeight);
  const progress = clamp(window.scrollY / introHeight);
  const titleOpacity = 1 - clamp((progress - 0.08) / 0.42);
  const headerOpacity = clamp((progress - 0.42) / 0.34);
  const rolePageOpacity = clamp((progress - 0.36) / 0.46);

  document.documentElement.style.setProperty("--intro-title-opacity", titleOpacity.toFixed(3));
  document.documentElement.style.setProperty("--header-opacity", headerOpacity.toFixed(3));
  document.documentElement.style.setProperty("--role-page-opacity", rolePageOpacity.toFixed(3));
  document.body.classList.toggle("is-header-visible", headerOpacity > 0.08);
}

function restoreExploreHash() {
  if (isRoleRoomPage || window.location.hash !== "#explore") return;
  const explore = document.querySelector("#explore");
  if (!explore) return;
  requestAnimationFrame(() => {
    explore.scrollIntoView({ block: "start" });
    updateIntroScroll();
  });
}

function setV15MenuState(isOpen) {
  if (!v15MenuToggle || !v15RoleMenu) return;
  document.body.classList.toggle("is-v15-menu-open", isOpen);
  v15MenuToggle.setAttribute("aria-expanded", String(isOpen));
}

function bindV15Menu() {
  if (!v15MenuToggle || !v15RoleMenu) return;
  v15MenuToggle.addEventListener("click", () => {
    setV15MenuState(!document.body.classList.contains("is-v15-menu-open"));
  });
  v15RoleMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (/^(mailto:|tel:)/i.test(link.getAttribute("href") || "")) return;
      event.preventDefault();
      document.body.classList.add("is-v15-leaving");
      window.setTimeout(() => {
        window.location.href = link.href;
      }, 240);
    });
  });
}

function projectHref(path = "") {
  if (!path) return "";
  if (/^(https?:|mailto:|tel:|#)/i.test(path)) return path;
  return `${projectRoot}${String(path).replace(/^\.\.\//, "")}`;
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

function getLocalizedDetail(item, lang = getSiteLanguage()) {
  if (!item) return "";
  const meta = item.meta || {};
  if (lang === "en") return meta.detailEn || meta.detailKo || meta.detail || "";
  return meta.detailKo || meta.detail || meta.detailEn || "";
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

function createNovelCard(item, index) {
  const originalIndex = topLevelNovelItems.findIndex((novel) => novel.id === item.id);
  const notionItem = findWritingByContent(item);
  const coverAsset = getNovelCoverAsset(item);
  const hookText = getMetaText(item, "summary", "");
  const card = document.createElement("article");
  const cover = document.createElement("span");
  const label = document.createElement("span");
  const copy = document.createElement("span");
  const title = document.createElement("strong");
  const tags = document.createElement("span");
  const options = document.createElement("span");
  const overlay = document.createElement("span");
  const overlayText = document.createElement("span");
  const notionButton = document.createElement("button");

  card.className = originalIndex % 3 === 1 ? "novel-card novel-card-blue" : "novel-card";
  if (coverAsset) {
    const image = document.createElement("img");
    card.classList.add("novel-card-with-cover");
    cover.className = "novel-card-cover";
    image.src = projectHref(coverAsset);
    image.alt = getLocalizedTitle(item);
    image.loading = "lazy";
    cover.append(image);
  }
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.dataset.orbitIndex = String(index);
  const canOpenFromCard = () => {
    const panel = card.closest("[data-role-panel]");
    return panel
      ? panel.classList.contains("is-expanded") && panel.classList.contains("is-detail-ready")
      : true;
  };

  card.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!canOpenFromCard()) return;
    renderMarkdownReader(item.id, true);
  });
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      if (!canOpenFromCard()) return;
      renderMarkdownReader(item.id, true);
    }
  });
  label.textContent = String(originalIndex + 1).padStart(2, "0");
  copy.className = "novel-card-copy";
  title.textContent = getLocalizedTitle(item);
  tags.className = "novel-card-tags";
  tags.textContent = (item.meta?.tags || []).join(" ");
  options.className = "novel-card-actions";
  overlay.className = "novel-card-overlay";
  overlayText.className = "novel-card-overlay-text";
  overlayText.textContent = hookText || getLocalizedTitle(item);
  notionButton.type = "button";
  notionButton.textContent = "Notion";
  notionButton.disabled = !notionItem;
  notionButton.addEventListener("click", (event) => {
    event.stopPropagation();
    if (notionItem) renderReader(notionItem.id, true);
  });

  options.append(notionButton);
  overlay.append(overlayText);
  copy.append(title, tags);
  card.append(cover, label, copy, options, overlay);
  return card;
}

function createNovelGridBook(item) {
  const originalIndex = topLevelNovelItems.findIndex((novel) => novel.id === item.id);
  const notionItem = findWritingByContent(item);
  const coverAsset = getNovelCoverAsset(item);
  const hookText = getMetaText(item, "summary", "");
  const book = document.createElement("article");
  const cover = document.createElement("span");
  const label = document.createElement("span");
  const copy = document.createElement("span");
  const title = document.createElement("strong");
  const tags = document.createElement("span");
  const options = document.createElement("span");
  const overlay = document.createElement("span");
  const overlayText = document.createElement("span");
  const notionButton = document.createElement("button");

  book.className = originalIndex % 3 === 1 ? "novel-grid-book novel-grid-book-blue" : "novel-grid-book";
  if (coverAsset) {
    const image = document.createElement("img");
    book.classList.add("novel-grid-book-with-cover");
    cover.className = "novel-grid-book-cover";
    image.src = projectHref(coverAsset);
    image.alt = getLocalizedTitle(item);
    image.loading = "lazy";
    cover.append(image);
  }

  book.tabIndex = 0;
  book.setAttribute("role", "button");
  book.addEventListener("click", (event) => {
    event.stopPropagation();
    renderMarkdownReader(item.id, true);
  });
  book.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      renderMarkdownReader(item.id, true);
    }
  });

  label.textContent = String(originalIndex + 1).padStart(2, "0");
  copy.className = "novel-grid-book-copy";
  title.textContent = getLocalizedTitle(item);
  tags.className = "novel-grid-book-tags";
  tags.textContent = (item.meta?.tags || []).join(" ");
  options.className = "novel-grid-book-actions";
  overlay.className = "novel-grid-book-overlay";
  overlayText.className = "novel-grid-book-overlay-text";
  overlayText.textContent = hookText || getLocalizedTitle(item);
  notionButton.type = "button";
  notionButton.textContent = "Notion";
  notionButton.disabled = !notionItem;
  notionButton.addEventListener("click", (event) => {
    event.stopPropagation();
    if (notionItem) renderReader(notionItem.id, true);
  });

  options.append(notionButton);
  overlay.append(overlayText);
  copy.append(title, tags);
  book.append(cover, label, copy, options, overlay);
  return book;
}

function createNovelGridCell(item) {
  const cell = document.createElement("div");
  cell.className = "novel-grid-cell";
  cell.append(createNovelGridBook(item));
  return cell;
}

function getVisualNovelItems(minimum = 22) {
  if (topLevelNovelItems.length === 0) return [];
  const repeatCount = Math.max(2, Math.ceil(minimum / topLevelNovelItems.length));
  return Array.from({ length: repeatCount }, (_, repeatIndex) =>
    topLevelNovelItems.map((_, itemIndex) => topLevelNovelItems[(itemIndex + repeatIndex) % topLevelNovelItems.length])
  ).flat();
}

function normalizeAngle(angle) {
  return ((((angle + 180) % 360) + 360) % 360) - 180;
}

function getNovelOrbitContainers() {
  return [...document.querySelectorAll("[data-novel-view-stage='orbit']")].filter(
    (container) => !container.hidden && container.querySelector(".novel-card")
  );
}

function resetNovelHoverVelocity() {
  novelOrbit.targetVelocity = novelOrbit.defaultVelocity;
}

function updateNovelPointerVelocity(event) {
  const container = event.currentTarget;
  if (!container || container.hidden) return;

  const containerRect = container.getBoundingClientRect();
  const containerCenterX = containerRect.left + containerRect.width / 2;
  const lowerThreshold = containerRect.top + containerRect.height * 0.28;
  const pointerX = event.clientX;
  const pointerY = event.clientY;
  const centerDeadZone = containerRect.width * 0.12;
  const halfWidth = containerRect.width / 2;
  const distanceFromCenter = pointerX - containerCenterX;

  if (pointerY < lowerThreshold || Math.abs(distanceFromCenter) <= centerDeadZone) {
    novelOrbit.targetVelocity = NOVEL_SLOW_VELOCITY;
    return;
  }

  const travel = Math.max(halfWidth - centerDeadZone, 1);
  const strength = clamp((Math.abs(distanceFromCenter) - centerDeadZone) / travel);
  const sideVelocity = distanceFromCenter < 0 ? NOVEL_HOVER_VELOCITY : -NOVEL_HOVER_VELOCITY;
  novelOrbit.targetVelocity = NOVEL_SLOW_VELOCITY + (sideVelocity - NOVEL_SLOW_VELOCITY) * strength;
}

function positionNovelOrbitCards() {
  const containers = getNovelOrbitContainers();
  if (containers.length === 0) return;

  containers.forEach((container) => {
    const cards = Array.from(container.querySelectorAll(".novel-card"));
    if (cards.length === 0) return;

    const deckWidth = container.clientWidth || 860;
    const deckHeight = container.clientHeight || 460;
    const isRoleNovelStage = container.classList.contains("role-novel-stage");
    const radius = Math.min(deckWidth * (isRoleNovelStage ? 0.44 : 0.72), isRoleNovelStage ? 600 : 820);
    const verticalRadius = Math.min(radius, deckHeight * (isRoleNovelStage ? 0.68 : 0.94));
    const visibleLimit = isRoleNovelStage ? 78 : 86;
    const step = 24;
    const centerIndex = isRoleNovelStage ? Math.floor(cards.length / 2) : 0;

    cards.forEach((card, index) => {
      const rawAngle = (index - centerIndex) * step + novelOrbit.angle;
      const angle = normalizeAngle(rawAngle);
      const radians = (angle * Math.PI) / 180;
      const distance = Math.abs(angle);
      const x = Math.sin(radians) * radius;
      const y = -Math.cos(radians) * verticalRadius;
      const isVisible = distance <= visibleLimit;
      const scale = isVisible ? Math.max(0.76, 1 - distance / 310) : 0.66;
      const opacity = isVisible ? 1 : 0;
      const layer = isVisible ? Math.max(1, Math.round(33 * (1 - distance / visibleLimit))) : 1;

      card.style.setProperty("--orbit-x", `${x.toFixed(2)}px`);
      card.style.setProperty("--orbit-y", `${y.toFixed(2)}px`);
      card.style.setProperty("--orbit-rotation", `${angle.toFixed(2)}deg`);
      card.style.setProperty("--orbit-scale", scale.toFixed(3));
      card.style.setProperty("--orbit-opacity", opacity.toFixed(3));
      card.style.setProperty("--orbit-layer", String(layer));
      card.style.setProperty("--orbit-pointer", isVisible ? "auto" : "none");
      card.setAttribute("aria-hidden", String(!isVisible));
      card.tabIndex = isVisible ? 0 : -1;
    });
  });
}

function tickNovelOrbit(time) {
  if (!novelOrbit.lastTime) novelOrbit.lastTime = time;
  const delta = Math.min(time - novelOrbit.lastTime, 40);
  novelOrbit.lastTime = time;
  const velocityEase = 1 - Math.pow(0.001, delta / NOVEL_VELOCITY_EASE_MS);
  novelOrbit.velocity += (novelOrbit.targetVelocity - novelOrbit.velocity) * velocityEase;
  novelOrbit.angle = normalizeAngle(novelOrbit.angle + novelOrbit.velocity * delta * 0.018);
  positionNovelOrbitCards();
  novelOrbit.frame = requestAnimationFrame(tickNovelOrbit);
}

function startNovelOrbit() {
  positionNovelOrbitCards();

  if (!novelOrbit.bound) {
    novelOrbit.bound = true;
    window.addEventListener("resize", positionNovelOrbitCards);
  }

  if (!novelOrbit.frame) {
    novelOrbit.lastTime = 0;
    novelOrbit.frame = requestAnimationFrame(tickNovelOrbit);
  }
}

function stopNovelOrbit() {
  if (novelOrbit.frame) {
    cancelAnimationFrame(novelOrbit.frame);
    novelOrbit.frame = null;
    novelOrbit.lastTime = 0;
  }
}

function resetNovelGridScroll() {
  document.querySelectorAll("[data-novel-view-stage='grid']").forEach((stage) => {
    stage.scrollTop = 0;
    stage.scrollLeft = 0;
  });
}

function updateNovelViewControls() {
  document.querySelectorAll("[data-novel-view]").forEach((control) => {
    const isActive = control.dataset.novelView === novelView.mode;
    control.classList.toggle("is-active", isActive);
    control.setAttribute("aria-pressed", String(isActive));
  });
}

function syncNovelViewMode() {
  document.querySelectorAll(".role-section-body-novel").forEach((body) => {
    body.dataset.novelViewMode = novelView.mode;
  });
  document.querySelectorAll("[data-novel-view-stage]").forEach((stage) => {
    const isActive = stage.dataset.novelViewStage === novelView.mode;
    stage.hidden = !isActive;
    stage.style.display = isActive ? "" : "none";
    stage.style.visibility = isActive ? "" : "hidden";
    stage.style.pointerEvents = isActive ? "" : "none";
    stage.setAttribute("aria-hidden", String(!isActive));
  });
  resetNovelHoverVelocity();
  updateNovelViewControls();
  if (novelView.mode === "orbit") {
    startNovelOrbit();
    requestAnimationFrame(positionNovelOrbitCards);
  } else {
    stopNovelOrbit();
    resetNovelGridScroll();
    requestAnimationFrame(resetNovelGridScroll);
  }
}

function bindNovelOrbitStage(container) {
  if (!container) return;
  if (container.dataset.novelPointerBound !== "true") {
    container.dataset.novelPointerBound = "true";
    container.addEventListener("pointermove", updateNovelPointerVelocity);
    container.addEventListener("pointerleave", resetNovelHoverVelocity);
  }
}

function renderNovelStages(orbitContainer, gridContainer) {
  if (orbitContainer) {
    bindNovelOrbitStage(orbitContainer);
    orbitContainer.replaceChildren(...getVisualNovelItems(18).map((item, index) => createNovelCard(item, index)));
  }

  if (gridContainer) {
    gridContainer.replaceChildren(...topLevelNovelItems.map((item) => createNovelGridCell(item)));
  }

  syncNovelViewMode();
}

function setNovelViewMode(mode) {
  const activeMode = mode === "grid" ? "grid" : "orbit";
  if (novelView.mode === activeMode) {
    syncNovelViewMode();
    return;
  }

  novelView.mode = activeMode;
  syncNovelViewMode();
}

function bindNovelViewControls() {
  document.querySelectorAll("[data-novel-view]").forEach((control) => {
    if (control.dataset.novelViewBound === "true") return;
    control.dataset.novelViewBound = "true";
    control.addEventListener("click", () => setNovelViewMode(control.dataset.novelView));
  });
  updateNovelViewControls();
}

function createNovelViewButton(mode, label) {
  const button = document.createElement("button");
  const icon = document.createElement("span");
  button.type = "button";
  button.className = "novel-view-button";
  button.dataset.novelView = mode;
  button.setAttribute("aria-label", label);
  button.setAttribute("aria-pressed", String(novelView.mode === mode));
  icon.className = `novel-view-icon novel-view-icon-${mode}`;
  button.append(icon);
  return button;
}

function createRoleItemButton(label, onClick, options = {}) {
  const button = document.createElement("button");
  button.type = "button";
  if (options.image) {
    const image = document.createElement("img");
    image.src = projectHref(options.image);
    image.alt = label;
    image.loading = "lazy";
    button.append(image);
  }
  const kicker = document.createElement("span");
  const title = document.createElement("strong");
  kicker.textContent = options.kicker || "open";
  if (options.description) {
    const titleText = document.createElement("span");
    const description = document.createElement("small");
    titleText.className = "cv-entry-title";
    description.className = "cv-entry-detail";
    titleText.textContent = label;
    String(options.description)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        const detailLine = document.createElement("span");
        detailLine.textContent = line;
        description.append(detailLine);
      });
    title.append(titleText, description);
  } else {
    title.textContent = label;
  }
  button.append(kicker, title);
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    onClick();
  });
  return button;
}

function openGalleryAsset(filename) {
  if (!readerTitle || !readerSource || !readerContent) return;
  const src = projectHref(`content/gallery/assets/${filename}`);
  const descriptionPath = projectHref(`content/gallery/assets/${filename.replace(/\.[^.]+$/, ".md")}`);
  const isVideo = /\.(mov|mp4|webm)$/i.test(filename);
  setReaderVariant("");
  currentReader = { type: "asset", id: filename };

  readerTitle.textContent = readerSettings.lang === "ko" ? "이미지" : "Visual Asset";
  readerSource.href = src;
  readerSource.textContent = "";
  readerSource.target = "_blank";
  readerSource.rel = "noreferrer";

  const wrapper = document.createElement("div");
  const figure = document.createElement("figure");
  const media = document.createElement(isVideo ? "video" : "img");
  const detail = document.createElement("section");
  const detailLabel = document.createElement("span");
  const detailBody = document.createElement("div");

  wrapper.className = "gallery-asset-reader";
  figure.className = "notion-media gallery-asset-preview";
  media.src = src;
  if (isVideo) {
    media.controls = true;
    media.playsInline = true;
  } else {
    media.alt = filename;
    media.loading = "lazy";
  }

  detail.className = "gallery-asset-detail";
  detailLabel.textContent = readerSettings.lang === "ko" ? "설명" : "Description";
  detailBody.className = "gallery-asset-description";
  detailBody.textContent = readerSettings.lang === "ko"
    ? "추후 같은 이름의 markdown 파일을 연결합니다."
    : "A markdown description can be added with the same filename.";

  figure.append(media);
  detail.append(detailLabel, detailBody);
  wrapper.append(figure, detail);
  readerContent.replaceChildren(wrapper);
  readerContent.scrollTop = 0;
  openReader();

  fetch(descriptionPath)
    .then((response) => (response.ok ? response.text() : ""))
    .then((markdown) => {
      if (currentReader.type !== "asset" || currentReader.id !== filename || !markdown.trim()) return;
      detailBody.replaceChildren(...renderMarkdown(markdown, "", {
        basePath: `content/gallery/assets/${filename.replace(/\.[^.]+$/, ".md")}`,
      }));
    })
    .catch(() => {
      // Description markdown is optional and can be added later.
    });
}

function createGalleryAssetButton(filename) {
  const button = document.createElement("button");
  const isVideo = /\.(mov|mp4|webm)$/i.test(filename);
  const media = document.createElement(isVideo ? "video" : "img");

  button.type = "button";
  button.className = "gallery-asset-button";
  button.setAttribute("aria-label", filename);
  media.src = projectHref(`content/gallery/assets/${filename}`);
  if (isVideo) {
    media.muted = true;
    media.playsInline = true;
    media.preload = "metadata";
  } else {
    media.alt = filename;
    media.loading = "lazy";
  }
  button.append(media);
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    openGalleryAsset(filename);
  });
  return button;
}

function getGalleryAssetPath(asset = "") {
  const clean = String(asset).trim().replace(/^["']|["']$/g, "");
  if (!clean) return "";
  if (/^(https?:|data:|blob:)/i.test(clean)) return clean;
  if (clean.startsWith("content/")) return projectHref(clean);
  if (clean.startsWith("assets/")) return projectHref(`content/gallery/${clean}`);
  if (clean.includes("/")) return projectHref(clean);
  return projectHref(`content/gallery/assets/${clean}`);
}

function getGalleryProjectDirectory(item) {
  const itemPath = String(item?.path || "").replace(/\\/g, "/");
  if (!itemPath.includes("/")) return "content/gallery";
  return itemPath.split("/").slice(0, -1).join("/");
}

function resolveGalleryProjectAsset(item, asset = "") {
  const clean = String(asset).trim().replace(/^["']|["']$/g, "");
  if (!clean) return "";
  if (/^(https?:|data:|blob:)/i.test(clean)) return clean;
  if (clean.startsWith("content/")) return clean;
  if (clean.startsWith("assets/")) return `content/gallery/${clean}`;
  if (clean.startsWith("../") || clean.startsWith("/")) return clean;

  const directory = getGalleryProjectDirectory(item);
  return `${directory}/${clean.replace(/^\.\//, "")}`;
}

function getProjectDirectory(item) {
  const itemPath = String(item?.path || "").replace(/\\/g, "/");
  if (!itemPath.includes("/")) return "content";
  return itemPath.split("/").slice(0, -1).join("/");
}

function resolveNovelProjectAsset(item, asset = "") {
  const clean = String(asset).trim().replace(/^["']|["']$/g, "");
  if (!clean) return "";
  if (/^(https?:|data:|blob:)/i.test(clean)) return clean;
  if (clean.startsWith("content/") || clean.startsWith("../") || clean.startsWith("/")) return clean;

  const directory = getProjectDirectory(item);
  return `${directory}/${clean.replace(/^\.\//, "")}`;
}

function getNovelProjectAssets(item) {
  const listed = Array.isArray(item.meta?.assets) ? item.meta.assets : [];
  const assets = [item.meta?.cover, item.meta?.image, ...listed]
    .filter(Boolean)
    .map((asset) => String(asset).trim())
    .filter(Boolean)
    .map((asset) => resolveNovelProjectAsset(item, asset));
  return [...new Set(assets)];
}

function getNovelCoverAsset(item) {
  const assets = getNovelProjectAssets(item);
  const cover = item.meta?.cover || item.meta?.image;
  if (cover) return resolveNovelProjectAsset(item, cover);
  return assets.find((asset) => /\/cover\.[^.]+$/i.test(asset) || /^cover\.[^.]+$/i.test(asset)) || "";
}

function getGalleryProjectAssets(item) {
  const listed = Array.isArray(item.meta?.assets) ? item.meta.assets : [];
  const assets = [item.meta?.image, ...listed]
    .filter(Boolean)
    .map((asset) => String(asset).trim())
    .filter(Boolean)
    .map((asset) => resolveGalleryProjectAsset(item, asset));
  return [...new Set(assets)];
}

function sortGalleryProjects(items) {
  return [...items].sort((a, b) => {
    const yearA = Number.parseInt(a.meta?.year, 10) || 0;
    const yearB = Number.parseInt(b.meta?.year, 10) || 0;
    if (yearA !== yearB) return yearB - yearA;
    return (a.order ?? 9999) - (b.order ?? 9999);
  });
}

function createGalleryMedia(asset, title, options = {}) {
  const isVideo = /\.(mov|mp4|webm)$/i.test(asset);
  const media = document.createElement(isVideo ? "video" : "img");
  media.src = getGalleryAssetPath(asset);
  if (isVideo) {
    media.muted = options.muted !== false;
    media.playsInline = true;
    media.preload = "metadata";
    media.controls = Boolean(options.controls);
  } else {
    media.alt = title;
    media.loading = "lazy";
  }
  return media;
}

function ensureGalleryOriginalModal() {
  if (galleryOriginalModal && galleryOriginalMedia) return galleryOriginalModal;

  const modal = document.createElement("div");
  const backdrop = document.createElement("button");
  const frame = document.createElement("div");
  const closeButton = document.createElement("button");
  const mediaWrap = document.createElement("div");

  modal.className = "gallery-original-modal";
  modal.setAttribute("aria-hidden", "true");
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  backdrop.type = "button";
  backdrop.className = "gallery-original-backdrop";
  backdrop.setAttribute("aria-label", readerSettings.lang === "ko" ? "원본 이미지 닫기" : "Close original image");
  frame.className = "gallery-original-frame";
  closeButton.type = "button";
  closeButton.className = "gallery-original-close";
  closeButton.textContent = "×";
  closeButton.setAttribute("aria-label", readerSettings.lang === "ko" ? "원본 이미지 닫기" : "Close original image");
  mediaWrap.className = "gallery-original-media";

  frame.append(closeButton, mediaWrap);
  modal.append(backdrop, frame);
  document.body.append(modal);

  backdrop.addEventListener("click", closeGalleryOriginal);
  closeButton.addEventListener("click", closeGalleryOriginal);

  galleryOriginalModal = modal;
  galleryOriginalMedia = mediaWrap;
  return modal;
}

function openGalleryOriginal(asset, title) {
  if (!asset) return;
  ensureGalleryOriginalModal();

  const src = getGalleryAssetPath(asset);
  const isVideo = /\.(mov|mp4|webm)$/i.test(asset);
  const media = document.createElement(isVideo ? "video" : "img");

  media.src = src;
  if (isVideo) {
    media.controls = true;
    media.playsInline = true;
  } else {
    media.alt = title;
  }

  galleryOriginalMedia.replaceChildren(media);
  galleryOriginalModal.classList.add("is-open");
  galleryOriginalModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("gallery-original-open");
}

function closeGalleryOriginal() {
  if (!galleryOriginalModal || !galleryOriginalMedia) return;
  galleryOriginalModal.classList.remove("is-open");
  galleryOriginalModal.setAttribute("aria-hidden", "true");
  galleryOriginalMedia.replaceChildren();
  document.body.classList.remove("gallery-original-open");
}

function openGalleryProject(item, startIndex = 0, options = {}) {
  if (!readerTitle || !readerSource || !readerContent) return;
  prepareReaderLanguage(item, { preserveLanguage: options.preserveLanguage });
  const readerLanguage = getReaderLanguage();
  const title = getLocalizedTitle(item, readerLanguage);
  const assets = getGalleryProjectAssets(item);
  const total = assets.length;
  let activeIndex = Math.min(Math.max(Number(startIndex) || 0, 0), Math.max(total - 1, 0));

  setReaderVariant("gallery");
  currentReader = { type: "gallery", id: item.id };
  currentGalleryProject = { item, index: activeIndex };
  readerTitle.textContent = title;
  readerSource.href = getGalleryAssetPath(assets[activeIndex] || "");
  readerSource.textContent = "";
  readerSource.target = "_blank";
  readerSource.rel = "noreferrer";

  const wrapper = document.createElement("div");
  const stage = document.createElement("div");
  const figure = document.createElement("figure");
  const navRow = document.createElement("div");
  const navCounter = document.createElement("span");
  const previousButton = document.createElement("button");
  const nextButton = document.createElement("button");
  const info = document.createElement("section");
  const infoToggle = document.createElement("button");
  const infoLabel = document.createElement("span");
  const detailBody = document.createElement("div");

  wrapper.className = "gallery-project-reader gallery-project-viewer";
  stage.className = "gallery-project-viewer-stage";
  figure.className = "gallery-project-viewer-figure";
  navRow.className = "gallery-project-nav-row";
  navCounter.className = "gallery-project-nav-counter";
  previousButton.type = "button";
  previousButton.className = "gallery-project-nav gallery-project-nav-prev";
  previousButton.textContent = "←";
  previousButton.setAttribute("aria-label", readerLanguage === "ko" ? "이전 이미지" : "Previous image");
  nextButton.type = "button";
  nextButton.className = "gallery-project-nav gallery-project-nav-next";
  nextButton.textContent = "→";
  nextButton.setAttribute("aria-label", readerLanguage === "ko" ? "다음 이미지" : "Next image");
  info.className = "gallery-project-info";
  infoToggle.type = "button";
  infoToggle.className = "gallery-project-info-toggle";
  infoToggle.setAttribute("aria-expanded", "false");
  infoLabel.className = "gallery-project-info-label";
  infoLabel.textContent = "Detail";
  detailBody.className = "gallery-project-info-body gallery-project-detail-body";
  infoToggle.append(infoLabel);

  const setActiveAsset = (index) => {
    activeIndex = (index + total) % total;
    currentReader = { type: "gallery", id: item.id };
    currentGalleryProject = { item, index: activeIndex };
    const asset = assets[activeIndex] || "";
    const media = createGalleryMedia(asset, title, { controls: true, muted: false });
    const paddedIndex = String(activeIndex + 1).padStart(2, "0");
    const paddedTotal = String(total).padStart(2, "0");
    navCounter.textContent = total > 1 ? `${paddedIndex} OF ${paddedTotal}` : "";
    detailBody.textContent = getLocalizedDetail(item, readerLanguage) || item.meta?.year || "";
    readerSource.href = getGalleryAssetPath(asset);
    figure.replaceChildren(media);
    if (media.tagName.toLowerCase() === "img") {
      media.classList.add("gallery-project-open-original");
      media.tabIndex = 0;
      media.setAttribute("role", "button");
      media.setAttribute("aria-label", readerLanguage === "ko" ? "원본 이미지 열기" : "Open original image");
      media.addEventListener("click", () => openGalleryOriginal(asset, title));
      media.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openGalleryOriginal(asset, title);
        }
      });
    }
    wrapper.classList.toggle("is-single", total <= 1);
  };

  previousButton.addEventListener("click", () => setActiveAsset(activeIndex - 1));
  nextButton.addEventListener("click", () => setActiveAsset(activeIndex + 1));
  infoToggle.addEventListener("click", () => {
    const isOpen = info.classList.toggle("is-open");
    infoToggle.setAttribute("aria-expanded", String(isOpen));
  });

  info.append(infoToggle, detailBody);
  navRow.append(previousButton, navCounter, nextButton);
  stage.append(figure, navRow);
  wrapper.append(stage, info);
  setActiveAsset(activeIndex);
  readerContent.replaceChildren(wrapper);
  if (options.scrollState) restoreReaderScrollState(options.scrollState);
  else readerContent.scrollTop = 0;
  openReader();
}

function createGalleryProjectButton(item) {
  const group = document.createElement("section");
  const mainButton = document.createElement("button");
  const overlay = document.createElement("span");
  const overlayText = document.createElement("span");
  const assets = getGalleryProjectAssets(item);
  const projectTitle = getLocalizedTitle(item);
  const projectYear = String(item.meta?.year || "");
  const mainAsset = assets[0] || "";

  group.className = "gallery-project-card";
  group.dataset.galleryLayout = item.meta?.layout || "default";
  group.dataset.assetCount = String(assets.length);
  group.setAttribute("aria-label", projectTitle);

  mainButton.type = "button";
  mainButton.className = "gallery-project-main";
  mainButton.setAttribute("aria-label", `${projectTitle} main image`);
  if (mainAsset) mainButton.append(createGalleryMedia(mainAsset, projectTitle));
  mainButton.addEventListener("click", (event) => {
    event.stopPropagation();
    openGalleryProject(item, 0);
  });

  overlay.className = "gallery-project-overlay";
  overlayText.className = "gallery-project-overlay-text";
  overlayText.textContent = [projectYear, projectTitle].filter(Boolean).join(", ");
  overlay.append(overlayText);
  mainButton.append(overlay);
  group.append(mainButton);

  if (assets.length > 1) {
    const previews = document.createElement("div");
    previews.className = "gallery-project-previews";
    assets.slice(1, 4).forEach((asset) => {
      const index = assets.indexOf(asset);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "gallery-project-preview";
      button.setAttribute("aria-label", `${projectTitle} preview ${index + 1}`);
      button.append(createGalleryMedia(asset, projectTitle));
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        openGalleryProject(item, index);
      });
      previews.append(button);
    });
    group.append(previews);
  }

  return group;
}

function getGalleryMasonryColumnCount() {
  if (window.matchMedia("(max-width: 520px)").matches) return 1;
  if (window.matchMedia("(max-width: 900px)").matches) return 2;
  return 3;
}

function getGalleryProjectMasonryWeight(item) {
  const layout = item.meta?.layout || "default";
  const assets = getGalleryProjectAssets(item);
  const layoutWeights = {
    landscape: 0.78,
    mixed: 1.05,
    pair: 1.0,
    portrait: 1.58,
    series: 1.18,
    single: 1.12,
    square: 1.0,
  };
  return (layoutWeights[layout] || 1.0) + (assets.length > 1 ? 0.24 : 0);
}

function renderGalleryProjectMasonry(target, items) {
  const columnCount = getGalleryMasonryColumnCount();
  const columns = Array.from({ length: columnCount }, (_, index) => {
    const column = document.createElement("div");
    column.className = "gallery-project-column";
    column.dataset.galleryColumn = String(index + 1);
    return column;
  });
  const columnWeights = Array.from({ length: columnCount }, () => 0);

  items.forEach((item) => {
    const columnIndex = columnWeights.indexOf(Math.min(...columnWeights));
    columns[columnIndex].append(createGalleryProjectButton(item));
    columnWeights[columnIndex] += getGalleryProjectMasonryWeight(item);
  });

  galleryMasonryColumnCount = columnCount;
  target.dataset.galleryMasonryColumns = String(columnCount);
  target.replaceChildren(...columns);
}

function refreshGalleryMasonryOnResize() {
  const target = document.querySelector("#role-visual-items");
  if (!target) return;
  const nextColumnCount = getGalleryMasonryColumnCount();
  if (nextColumnCount === galleryMasonryColumnCount) return;
  renderGalleryProjectMasonry(target, sortGalleryProjects(topLevelGalleryItems));
}

function createGalleryMarkdownButton(item) {
  const button = document.createElement("button");
  const image = document.createElement("img");
  const title = getLocalizedTitle(item);
  button.type = "button";
  button.className = "gallery-asset-button gallery-markdown-button";
  button.setAttribute("aria-label", title);
  image.src = projectHref(item.meta?.image || "../assets/hero-workspace.png");
  image.alt = title;
  image.loading = "lazy";
  button.append(image);
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    renderMarkdownReader(item.id, true);
  });
  return button;
}

function getRoleItem(panelId) {
  return roleItems.find((item) => item.meta?.roleId === panelId) || null;
}

function getMetaText(item, key, fallback = "") {
  const lang = readerSettings.lang === "ko" ? "Ko" : "En";
  return item?.meta?.[`${key}${lang}`] || item?.meta?.[key] || fallback;
}

function createRoleHeading(title, handle = "", tagName = "strong") {
  const heading = document.createElement(tagName);
  heading.className = "role-heading";
  String(title)
    .split("//")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const lineNode = document.createElement("span");
      lineNode.className = "role-heading-line";
      lineNode.textContent = line;
      heading.append(lineNode);
    });
  if (handle) {
    const handleNode = document.createElement("b");
    const handleText = String(handle).trim();
    handleNode.className = "role-heading-handle";
    const handleLines = handleText
      .split("//")
      .map((line) => line.trim())
      .filter(Boolean);

    if (handleLines.length > 1) {
      handleNode.classList.add("role-heading-handle-multiline");
      handleLines.forEach((line, index) => {
        const rowNode = document.createElement("span");
        const markNode = document.createElement("span");
        const textNode = document.createElement("span");
        const hasVisibleMark = line.startsWith("@");
        rowNode.className = "role-heading-handle-row";
        markNode.className = "role-heading-mark";
        textNode.className = "role-heading-handle-text";
        markNode.textContent = "@";
        if (!hasVisibleMark) {
          markNode.classList.add("role-heading-mark-spacer");
          markNode.setAttribute("aria-hidden", "true");
        }
        textNode.textContent = line.replace(/^@/, "").trim();
        rowNode.append(markNode, textNode);
        handleNode.append(rowNode);
      });
    } else {
      const markNode = document.createElement("span");
      const textNode = document.createElement("span");
      markNode.className = "role-heading-mark";
      textNode.className = "role-heading-handle-text";
      markNode.textContent = handleText.startsWith("@") ? "@" : "";
      textNode.textContent = handleText.replace(/^@/, "").trim();
      handleNode.append(markNode, textNode);
    }
    heading.append(handleNode);
  }
  return heading;
}

function createProfileIcon(type) {
  const icon = document.createElement("span");
  icon.className = `role-profile-icon role-profile-icon-${type}`;
  icon.setAttribute("aria-hidden", "true");

  const icons = {
    linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5.1 8.9h3.1v10H5.1v-10Zm1.6-4.8a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6Zm4.2 4.8h3v1.4h.1c.4-.8 1.5-1.7 3-1.7 3.2 0 3.8 2.1 3.8 4.8v5.5h-3.1V14c0-1.2 0-2.7-1.6-2.7s-1.9 1.3-1.9 2.6v5h-3.1v-10Z"/></svg>',
    scholar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="m3 9 9-5 9 5-9 5-9-5Z"/><path d="M7 11.2v4.3c1.3 1.2 3 1.8 5 1.8s3.7-.6 5-1.8v-4.3"/><path d="M21 9v6"/></svg>',
    cv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M7 3h7l3 3v15H7V3Z"/><path d="M14 3v4h4"/><path d="M9.5 12h5"/><path d="M9.5 16h5"/></svg>',
  };

  icon.innerHTML = icons[type] || icons.cv;
  return icon;
}

function renderRoleMarkdownNote(markdown = "", body, context = {}) {
  const introParagraphs = getRecordIntro(markdown);
  if (introParagraphs.length === 0) return;

  const intro = document.createElement(introParagraphs.length > 1 ? "div" : "p");
  intro.className = introParagraphs.length > 1 ? "role-intro cv-intro cv-intro-stack" : "role-intro cv-intro";
  if (introParagraphs.length > 1) {
    introParagraphs.forEach((paragraph) => {
      const text = document.createElement("p");
      appendMarkdownText(text, paragraph, context);
      intro.append(text);
    });
  } else {
    appendMarkdownText(intro, introParagraphs[0], context);
  }
  body.append(intro);
}

function parseRecordSections(markdown = "") {
  const sections = [];
  let current = null;

  normalizeMarkdownSource(markdown).split("\n").forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) return;
    if (line.startsWith("## ")) {
      current = { title: line.slice(3).trim(), rows: [] };
      sections.push(current);
      return;
    }
    if (!current) return;
    const clean = line.replace(/^[-*]\s+/, "");
    const [label, ...rest] = clean.split("|");
    if (!label || rest.length === 0) return;
    current.rows.push({
      label: label.trim(),
      text: rest[0].trim(),
      detail: rest.slice(1).join("|").trim(),
    });
  });

  return sections;
}

function getRecordIntro(markdown = "") {
  const normalized = normalizeMarkdownSource(markdown);
  const firstHeadingIndex = normalized.search(/^##\s+/m);
  const intro = firstHeadingIndex === -1 ? normalized : normalized.slice(0, firstHeadingIndex);
  return intro
    .split(/\n\s*\n/)
    .map((paragraph) =>
      paragraph
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join(" ")
    )
    .filter(Boolean);
}

function appendMarkdownText(parent, text, context = {}) {
  text.split("\n").forEach((line, index) => appendMarkdownLine(parent, line, index, context));
}

function renderProfileLinks(item, titleTarget, titleText) {
  const links = document.createElement("div");
  links.className = "role-profile-links";
  links.setAttribute("aria-label", `${getMetaText(item, "detailTitle", item.title)} links`);

  const appendLink = (label, href, iconType) => {
    if (!href) return;
    const link = document.createElement("a");
    link.href = href;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.setAttribute("aria-label", label);
    link.title = label;
    link.append(createProfileIcon(iconType));
    links.append(link);
  };

  appendLink("LinkedIn", item.meta?.linkedin, "linkedin");
  appendLink("Google Scholar", item.meta?.scholar, "scholar");

  if (item.meta?.cvPdf) {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", "CV");
    button.title = "CV";
    button.append(createProfileIcon("cv"));
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openPdfFile(`CV - ${titleText}`, item.meta.cvPdf);
    });
    links.append(button);
  }

  if (links.children.length > 0) {
    titleTarget.append(links);
  }
}

function renderIdentityRole(item, body) {
  const statement = document.createElement("div");
  const figure = document.createElement("figure");
  const image = document.createElement("img");
  const caption = document.createElement("figcaption");
  const introLines = getRecordIntro(getLocalizedMarkdown(item));
  const residentImages = Array.isArray(item.meta?.residentImages) ? item.meta.residentImages : [];
  let activeResidentIndex = -1;

  body.classList.add("identity-detail");
  statement.className = "identity-statement role-intro cv-intro";
  statement.replaceChildren(
    ...introLines.map((line) => {
      const paragraph = document.createElement("p");
      appendMarkdownText(paragraph, line, {
        item,
        basePath: item.path,
      });
      return paragraph;
    })
  );

  figure.className = "identity-detail-portrait";
  image.alt = item.meta?.caption || getMetaText(item, "detailTitle", item.title);
  image.loading = "lazy";
  caption.textContent = item.meta?.caption || "";

  const setResidentImage = (entry = null) => {
    if (entry?.src) {
      const residentLabel = getLocalizedResidentLabel(entry);
      image.src = projectHref(entry.src);
      image.alt = residentLabel || getMetaText(item, "detailTitle", item.title);
      caption.textContent = residentLabel || "";
      return;
    }

    image.src = projectHref(item.meta?.image || "../assets/identity-portrait.png");
    image.alt = item.meta?.caption || getMetaText(item, "detailTitle", item.title);
    caption.textContent = item.meta?.caption || "";
  };

  const pickResidentImage = () => {
    if (residentImages.length === 0) return;
    let nextIndex = Math.floor(Math.random() * residentImages.length);
    if (residentImages.length > 1) {
      while (nextIndex === activeResidentIndex) {
        nextIndex = Math.floor(Math.random() * residentImages.length);
      }
    }
    activeResidentIndex = nextIndex;
    setResidentImage(residentImages[activeResidentIndex]);
  };

  if (residentImages.length > 0) {
    figure.tabIndex = 0;
    figure.setAttribute("role", "button");
    figure.setAttribute("aria-label", readerSettings.lang === "ko"
      ? "레지던트 이미지 무작위 선택"
      : "Randomize resident image");
    figure.addEventListener("click", pickResidentImage);
    figure.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        pickResidentImage();
      }
    });
    pickResidentImage();
  } else {
    setResidentImage();
  }

  figure.append(image, caption);
  body.append(statement, figure);
}

function renderCvRole(item, body) {
  const wrapper = document.createElement("div");
  const introParagraphs = getRecordIntro(getLocalizedMarkdown(item));
  wrapper.className = "engineer-scroll cv-scroll";

  if (introParagraphs.length > 0) {
    const intro = document.createElement(introParagraphs.length > 1 ? "div" : "p");
    intro.className = introParagraphs.length > 1 ? "cv-intro cv-intro-stack" : "cv-intro";
    if (introParagraphs.length > 1) {
      introParagraphs.forEach((paragraph) => {
        const text = document.createElement("p");
        appendMarkdownText(text, paragraph, {
          item,
          basePath: item.path,
        });
        intro.append(text);
      });
    } else {
      appendMarkdownText(intro, introParagraphs[0], {
        item,
        basePath: item.path,
      });
    }
    wrapper.append(intro);
  }

  parseRecordSections(getLocalizedMarkdown(item)).forEach((section) => {
    const block = document.createElement("section");
    const heading = document.createElement("h3");
    const list = document.createElement("div");
    block.className = "cv-block";
    heading.textContent = section.title;
    list.className = "cv-list";

    const sectionKey = section.title.toLowerCase();
    if (sectionKey === "projects") {
      list.id = "role-engineer-items";
      list.className = "role-items role-project-items cv-list";
    } else if (sectionKey === "paper") {
      list.id = "role-engineer-paper-items";
      list.className = "role-items role-paper-items cv-list";
    } else {
      section.rows.forEach((row) => {
        const article = document.createElement("article");
        const label = document.createElement("span");
        const text = document.createElement("p");
        const title = document.createElement("span");
        label.textContent = row.label;
        title.className = "cv-entry-title";
        appendMarkdownInline(title, row.text, {
          item,
          basePath: item.path,
        });
        text.append(title);
        if (row.detail) {
          const detail = document.createElement("small");
          detail.className = "cv-entry-detail";
          appendMarkdownInline(detail, row.detail, {
            item,
            basePath: item.path,
          });
          text.append(detail);
        }
        article.append(label, text);
        list.append(article);
      });
    }

    block.append(heading, list);
    wrapper.append(block);
  });

  body.append(wrapper);
}

function renderGalleryRole(item, body) {
  renderRoleMarkdownNote(getLocalizedMarkdown(item), body, {
    item,
    basePath: item.path,
  });
  const target = document.createElement("div");
  target.id = "role-visual-items";
  target.className = "role-items role-gallery-items";
  body.append(target);
}

function renderNovelRole(item, body) {
  renderRoleMarkdownNote(getLocalizedMarkdown(item), body, {
    item,
    basePath: item.path,
  });
  const controls = document.createElement("div");
  const orbit = createNovelViewButton("orbit", readerSettings.lang === "ko" ? "회전 보기" : "Rotation view");
  const grid = createNovelViewButton("grid", readerSettings.lang === "ko" ? "그리드 보기" : "Grid view");
  const orbitStage = document.createElement("div");
  const gridStage = document.createElement("div");

  controls.className = "novel-controls role-novel-controls";
  controls.setAttribute("aria-label", readerSettings.lang === "ko" ? "소설 보기 방식" : "Novel view controls");
  orbitStage.id = "role-novel-orbit-items";
  orbitStage.className = "role-novel-stage role-novel-orbit-stage novel-deck";
  orbitStage.dataset.novelViewStage = "orbit";
  gridStage.id = "role-novel-grid-items";
  gridStage.className = "role-novel-grid-stage";
  gridStage.dataset.novelViewStage = "grid";

  controls.append(orbit, grid);
  body.append(controls, orbitStage, gridStage);
}

function renderReadingRole(item, body) {
  renderRoleMarkdownNote(getLocalizedMarkdown(item), body, {
    item,
    basePath: item.path,
  });
  const target = document.createElement("div");
  target.id = "role-aesthetics-items";
  target.className = "role-items role-paper-items role-essay-items";
  body.append(target);
}

function renderRoleBody(item, body) {
  const layout = item.meta?.layout || "note";
  if (layout === "identity") renderIdentityRole(item, body);
  else if (layout === "cv") renderCvRole(item, body);
  else if (layout === "gallery") renderGalleryRole(item, body);
  else if (layout === "novel") renderNovelRole(item, body);
  else if (layout === "reading") renderReadingRole(item, body);
  else body.replaceChildren(...renderMarkdown(getLocalizedMarkdown(item), getLocalizedTitle(item), {
    item,
    basePath: item.path,
  }));
}

function closeRolePanels() {
  window.clearTimeout(roleReadyTimer);
  rolePanels.forEach((panel) => panel.classList.remove("is-hovered", "is-detail-ready"));
  document.body.classList.add("role-closing");
  window.setTimeout(() => {
    rolePanels.forEach((panel) => panel.classList.remove("is-expanded", "is-detail-ready"));
    document.body.classList.remove("role-focus");
    document.body.classList.remove("role-closing");
  }, ROLE_FADE_MS);
  requestAnimationFrame(positionNovelOrbitCards);
}

function renderRoleRoom() {
  if (!isRoleRoomPage || !roleRoomTarget) return;
  const item = getRoleItem(activeRoleRoom);
  if (!item) return;

  const detail = document.createElement("section");
  const title = document.createElement("div");
  const body = document.createElement("div");
  const detailText = getMetaText(item, "detailTitle", getLocalizedTitle(item));
  const handle = getMetaText(item, "handle", item.meta?.handle || "");

  detail.className = `role-detail role-detail-layout-${item.meta?.layout || "note"} role-room-detail`;

  title.className = "role-section-title";
  title.append(createRoleHeading(detailText, handle, "h2"));
  renderProfileLinks(item, title, detailText);

  body.className = `role-section-body role-section-body-${item.meta?.layout || "note"}`;
  body.dataset.roleBody = activeRoleRoom;
  renderRoleBody(item, body);

  detail.append(title, body);
  roleRoomTarget.replaceChildren(detail);
}

function renderRoleShells() {
  if (isRoleRoomPage) {
    renderRoleRoom();
    return;
  }

  rolePanels.forEach((panel) => {
    const item = getRoleItem(panel.dataset.rolePanel);
    if (!item) return;

    const trigger = document.createElement("button");
    const kicker = document.createElement("span");
    const tagline = document.createElement("em");
    const summary = document.createElement("small");
    const detail = document.createElement("div");
    const close = document.createElement("button");
    const title = document.createElement("div");
    const body = document.createElement("div");
    const titleText = getMetaText(item, "panelTitle", getLocalizedTitle(item));
    const detailText = getMetaText(item, "detailTitle", getLocalizedTitle(item));
    const handle = getMetaText(item, "handle", item.meta?.handle || "");

    trigger.type = "button";
    trigger.className = "role-hit";
    trigger.dataset.roleTrigger = panel.dataset.rolePanel;
    kicker.textContent = item.meta?.kicker || "";
    tagline.textContent = item.meta?.tagline || "";
    summary.textContent = item.meta?.summary || "";
    trigger.append(kicker, createRoleHeading(titleText, handle), tagline, summary);

    detail.className = `role-detail role-detail-layout-${item.meta?.layout || "note"}`;
    detail.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    close.type = "button";
    close.className = "role-close";
    close.dataset.roleClose = "";
    close.setAttribute("aria-label", `Close ${detailText}`);
    close.textContent = "×";
    close.addEventListener("click", (event) => {
      event.stopPropagation();
      closeRolePanels();
    });

    title.className = "role-section-title";
    title.append(createRoleHeading(detailText, handle, "h2"));
    renderProfileLinks(item, title, detailText);

    body.className = `role-section-body role-section-body-${item.meta?.layout || "note"}`;
    body.dataset.roleBody = panel.dataset.rolePanel;
    renderRoleBody(item, body);

    detail.append(close, title, body);
    panel.replaceChildren(trigger, detail);
  });
}

function renderRoleItems() {
  const engineerTarget = document.querySelector("#role-engineer-items");
  const visualTarget = document.querySelector("#role-visual-items");
  const novelOrbitTarget = document.querySelector("#role-novel-orbit-items");
  const novelGridTarget = document.querySelector("#role-novel-grid-items");
  const aestheticsTarget = document.querySelector("#role-aesthetics-items");
  const engineerPaperTarget = document.querySelector("#role-engineer-paper-items");

  if (engineerTarget) {
    engineerTarget.replaceChildren(
      ...topLevelEngineeringItems.map((item) =>
        createRoleItemButton(getLocalizedTitle(item), () => renderMarkdownReader(item.id, true), {
          kicker: item.meta?.label || "project",
          description: getLocalizedMarkdown(item),
        })
      )
    );
  }

  if (engineerPaperTarget) {
    engineerPaperTarget.replaceChildren(
      ...topLevelPaperItems.map((item, index) =>
        createRoleItemButton(getLocalizedTitle(item), () => {
          if (item.meta?.format === "pdf") {
            renderPdfReader(item.id);
          } else {
            renderMarkdownReader(item.id, true);
          }
        }, {
          kicker: item.meta?.year || "Paper",
          description: getLocalizedMarkdown(item),
        })
      )
    );
  }

  if (visualTarget) {
    const galleryProjects = sortGalleryProjects(topLevelGalleryItems);
    renderGalleryProjectMasonry(visualTarget, galleryProjects);
  }

  if (novelOrbitTarget || novelGridTarget) {
    renderNovelStages(novelOrbitTarget, novelGridTarget);
  }

  if (aestheticsTarget) {
    const readingItems = [...topLevelEssayItems].sort((a, b) => {
      const yearA = Number(a.meta?.year || 0);
      const yearB = Number(b.meta?.year || 0);
      if (yearA !== yearB) return yearB - yearA;
      return a.order - b.order;
    });
    aestheticsTarget.replaceChildren(
      ...readingItems.map((item, index) =>
        createRoleItemButton(getLocalizedTitle(item), () => {
          if (item.meta?.format === "pdf") {
            renderPdfReader(item.id);
          } else {
            renderMarkdownReader(item.id, true);
          }
        }, {
          kicker: item.meta?.year || `Essay ${String(index + 1).padStart(2, "0")}`,
          description: getMetaText(item, "summary", ""),
        })
      )
    );
  }
}

function openReader() {
  if (!readerModal) return;
  rolePanels.forEach((panel) => panel.classList.remove("is-hovered"));
  document.body.classList.remove("role-closing");
  readerModal.classList.add("is-open");
  readerModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("reader-open");
}

function openPdf() {
  if (!pdfModal) return;
  rolePanels.forEach((panel) => panel.classList.remove("is-hovered"));
  document.body.classList.remove("role-closing");
  pdfModal.classList.add("is-open");
  pdfModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("pdf-open");
}

function applyReaderSettings(options = {}) {
  if (!readerWindow) return;
  const readerLanguage = getReaderLanguage();
  readerWindow.dataset.lang = readerLanguage;
  readerWindow.dataset.size = readerSettings.size;
  readerWindow.dataset.spacing = readerSettings.spacing;
  readerSettings.theme = "light";
  readerWindow.dataset.theme = "light";

  if (readerLang) readerLang.value = readerLanguage;
  if (readerSize) readerSize.value = readerSettings.size;
  if (readerSpacing) readerSpacing.value = readerSettings.spacing;
  if (readerTheme) readerTheme.value = readerSettings.theme;

  if (options.persist !== false) saveReaderSettings();
}

function refreshCurrentReaderContent(scrollState = getReaderScrollState()) {
  if (currentReader.type === "content") {
    renderMarkdownReader(currentReader.id, false, {
      preserveLanguage: true,
      scrollState,
    });
    return;
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
    return;
  }
  if (currentReader.type === "gallery" && currentGalleryProject.item) {
    openGalleryProject(currentGalleryProject.item, currentGalleryProject.index, {
      preserveLanguage: true,
      scrollState,
    });
  }
}

function setReaderLanguage(lang) {
  const scrollState = getReaderScrollState();
  setActiveReaderLanguage(lang);
  applyReaderSettings({ persist: false });
  refreshCurrentReaderContent(scrollState);
}

function bindReaderSetting(control, key) {
  if (!control) return;
  control.addEventListener("change", () => {
    if (key === "lang") {
      setReaderLanguage(control.value);
      return;
    }
    readerSettings[key] = control.value;
    applyReaderSettings();
  });
}

function bindModalTouchScrollGuard(modal, scrollTarget) {
  if (!modal || !scrollTarget || modal.dataset.touchScrollGuardBound === "true") return;
  modal.dataset.touchScrollGuardBound = "true";
  modal.addEventListener("touchmove", (event) => {
    if (!document.body.classList.contains("reader-open")) return;
    if (scrollTarget.contains(event.target)) return;
    event.preventDefault();
  }, { passive: false });
}

function bindReaderManualTouchScroll(scrollTarget) {
  if (!scrollTarget || scrollTarget.dataset.manualTouchScrollBound === "true") return;
  scrollTarget.dataset.manualTouchScrollBound = "true";
  let lastTouchY = 0;

  scrollTarget.addEventListener("touchstart", (event) => {
    if (event.touches.length !== 1) return;
    lastTouchY = event.touches[0].clientY;
  }, { passive: true });

  scrollTarget.addEventListener("touchmove", (event) => {
    if (!document.body.classList.contains("reader-open")) return;
    if (event.touches.length !== 1) return;
    if (scrollTarget.scrollHeight <= scrollTarget.clientHeight) return;

    const nextTouchY = event.touches[0].clientY;
    const deltaY = lastTouchY - nextTouchY;
    lastTouchY = nextTouchY;
    scrollTarget.scrollTop += deltaY;
    event.preventDefault();
  }, { passive: false });
}

function closeReader() {
  if (!readerModal) return;
  closeGalleryOriginal();
  setReaderVariant("");
  activeReaderLanguage = "";
  readerHistory = [];
  updateReaderBackState();
  readerModal.classList.remove("is-open");
  readerModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("reader-open");
}

function closePdf() {
  if (!pdfModal) return;
  pdfModal.classList.remove("is-open");
  pdfModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("pdf-open");
  if (pdfFrame) pdfFrame.removeAttribute("src");
  if (pdfSource) {
    pdfSource.hidden = true;
    pdfSource.textContent = "";
  }
}

function isMobilePdfViewport() {
  return window.matchMedia("(max-width: 900px), (pointer: coarse)").matches;
}

function ensurePdfMobileFallback() {
  if (!pdfFrame) return null;
  let fallback = document.querySelector(".pdf-mobile-fallback");
  if (fallback) return fallback;

  fallback = document.createElement("div");
  fallback.className = "pdf-mobile-fallback";
  fallback.hidden = true;
  pdfFrame.insertAdjacentElement("afterend", fallback);
  return fallback;
}

function setPdfViewerSource(title, pdfPath) {
  if (!pdfSource || !pdfFrame) return;
  const href = projectHref(pdfPath);
  const fallback = ensurePdfMobileFallback();
  const linkText = readerSettings.lang === "ko" ? "PDF 열기" : "Open PDF";
  const noteText = readerSettings.lang === "ko"
    ? "모바일 브라우저에서는 PDF를 전체 화면으로 열어야 모든 페이지를 안정적으로 볼 수 있습니다."
    : "On mobile browsers, open the PDF directly to view every page reliably.";

  pdfSource.href = href;
  pdfSource.hidden = false;
  pdfSource.textContent = linkText;
  pdfSource.target = "_blank";
  pdfSource.rel = "noreferrer";
  pdfFrame.title = title;

  if (isMobilePdfViewport()) {
    pdfFrame.hidden = true;
    pdfFrame.removeAttribute("src");
    if (fallback) {
      const note = document.createElement("p");
      const link = document.createElement("a");
      note.textContent = noteText;
      link.href = href;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = linkText;
      fallback.replaceChildren(note, link);
      fallback.hidden = false;
    }
    return;
  }

  pdfFrame.hidden = false;
  pdfFrame.src = href;
  if (fallback) fallback.hidden = true;
}

function normalizeMarkdownTextLine(line) {
  const italicSentence = line.match(/^\*\s+(.+)\*$/);
  return italicSentence ? `*${italicSentence[1]}*` : line;
}

function appendMarkdownLink(parent, label, href, context = {}) {
  if (href.startsWith("notion:")) {
    const contentItem = findContentByHref(href);
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", () => {
      if (contentItem) openMarkdownReaderFromCurrent(contentItem.id);
    });
    button.disabled = !contentItem;
    parent.append(button);
    return;
  }

  const markdownItem = findContentByMarkdownHref(href, context);
  if (markdownItem) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", () => openMarkdownReaderFromCurrent(markdownItem.id));
    parent.append(button);
    return;
  }

  if (isMarkdownHref(href)) {
    const markdownPath = resolveContentRelativePath(href, context);
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", () => openMarkdownFileReaderFromCurrent(markdownPath, label, context.item));
    button.disabled = !markdownPath;
    parent.append(button);
    return;
  }

  const link = document.createElement("a");
  link.href = resolveMarkdownAssetHref(href, context);
  link.target = "_blank";
  link.rel = "noreferrer";
  appendMarkdownInline(link, label, context);
  parent.append(link);
}

function appendMarkdownImage(parent, alt, src, context = {}) {
  const image = document.createElement("img");
  image.src = resolveMarkdownAssetHref(src, context);
  image.alt = alt;
  image.loading = "lazy";
  parent.append(image);
}

function appendMarkdownInline(parent, text, context = {}) {
  const pattern = /(!?\[[^\]]*\]\([^)]+\)|`[^`\n]+`|\*\*[^*\n]+?\*\*|__[^_\n]+?__|~~[^~\n]+?~~|\*[^*\n]+?\*|_[^_\n]+?_|<br\s*\/?>)/gi;
  let cursor = 0;
  let match = pattern.exec(text);

  while (match) {
    const token = match[0];
    if (match.index > cursor) {
      parent.append(document.createTextNode(text.slice(cursor, match.index)));
    }

    const imageMatch = token.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);

    if (/^<br\s*\/?>$/i.test(token)) {
      parent.append(document.createElement("br"));
    } else if (imageMatch) {
      appendMarkdownImage(parent, imageMatch[1], imageMatch[2], context);
    } else if (linkMatch) {
      appendMarkdownLink(parent, linkMatch[1], linkMatch[2], context);
    } else if (token.startsWith("`") && token.endsWith("`")) {
      const code = document.createElement("code");
      code.className = "is-code";
      code.textContent = token.slice(1, -1);
      parent.append(code);
    } else if (token.startsWith("**") && token.endsWith("**")) {
      const strong = document.createElement("strong");
      strong.className = "is-bold";
      appendMarkdownInline(strong, token.slice(2, -2), context);
      parent.append(strong);
    } else if (token.startsWith("__") && token.endsWith("__")) {
      const strong = document.createElement("strong");
      strong.className = "is-bold";
      appendMarkdownInline(strong, token.slice(2, -2), context);
      parent.append(strong);
    } else if (token.startsWith("~~") && token.endsWith("~~")) {
      const strike = document.createElement("s");
      strike.className = "is-struck";
      appendMarkdownInline(strike, token.slice(2, -2), context);
      parent.append(strike);
    } else if (token.startsWith("*") && token.endsWith("*")) {
      const emphasis = document.createElement("em");
      emphasis.className = "is-italic";
      appendMarkdownInline(emphasis, token.slice(1, -1), context);
      parent.append(emphasis);
    } else if (token.startsWith("_") && token.endsWith("_")) {
      const emphasis = document.createElement("em");
      emphasis.className = "is-italic";
      appendMarkdownInline(emphasis, token.slice(1, -1), context);
      parent.append(emphasis);
    } else {
      parent.append(document.createTextNode(token));
    }

    cursor = pattern.lastIndex;
    match = pattern.exec(text);
  }

  if (cursor < text.length) {
    parent.append(document.createTextNode(text.slice(cursor)));
  }
}

function appendMarkdownLine(parent, line, index = 0, context = {}) {
  if (index > 0) parent.append(document.createElement("br"));
  appendMarkdownInline(parent, normalizeMarkdownTextLine(line), context);
}

function createMarkdownParagraph(lines, context = {}) {
  const paragraph = document.createElement("p");
  paragraph.className = "markdown-block";
  lines.forEach((line, index) => appendMarkdownLine(paragraph, line, index, context));
  return paragraph;
}

function createMarkdownHeading(level, text, context = {}) {
  const tagName = level <= 1 ? "h2" : level === 2 ? "h3" : "h4";
  const heading = document.createElement(tagName);
  heading.className = `markdown-heading markdown-heading-${level}`;
  appendMarkdownInline(heading, text, context);
  return heading;
}

function createMarkdownMediaBlock(line, context = {}) {
  const figure = document.createElement("figure");
  figure.className = "notion-media markdown-media";
  appendMarkdownInline(figure, line, context);
  return figure;
}

function createMarkdownList(items, ordered, context = {}) {
  const list = document.createElement(ordered ? "ol" : "ul");
  list.className = "markdown-list";
  items.forEach((item) => {
    const listItem = document.createElement("li");
    appendMarkdownInline(listItem, normalizeMarkdownTextLine(item), context);
    list.append(listItem);
  });
  return list;
}

function createMarkdownQuote(lines, context = {}) {
  const quote = document.createElement("blockquote");
  quote.className = "markdown-quote";
  lines.forEach((line, index) => appendMarkdownLine(quote, line, index, context));
  return quote;
}

function createMarkdownCodeBlock(lines) {
  const pre = document.createElement("pre");
  const code = document.createElement("code");
  pre.className = "markdown-code-block";
  code.textContent = lines.join("\n");
  pre.append(code);
  return pre;
}

function createMarkdownDivider() {
  const divider = document.createElement("hr");
  divider.className = "markdown-divider";
  return divider;
}

function getMarkdownListMatch(line) {
  if (/^\*\s+.+\*$/.test(line)) return null;
  const orderedMatch = line.match(/^(\d+)[.)]\s+(.+)$/);
  if (orderedMatch) return { ordered: true, text: orderedMatch[2] };

  const unorderedMatch = line.match(/^([-+*])\s+(.+)$/);
  if (unorderedMatch) return { ordered: false, text: unorderedMatch[2] };
  return null;
}

function normalizeMarkdownSource(markdown = "", lang = getSiteLanguage()) {
  let source = markdown.replace(/\r\n/g, "\n");

  if (source.startsWith("---\n")) {
    const frontmatterEnd = source.indexOf("\n---", 4);
    if (frontmatterEnd !== -1) source = source.slice(frontmatterEnd + 4).trimStart();
  }

  const markerPattern = /<!--\s*(ko|en)\s*-->/gi;
  const matches = [...source.matchAll(markerPattern)];
  if (!matches.length) return source;

  const sections = {};
  matches.forEach((match, index) => {
    const lang = match[1].toLowerCase();
    const start = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? source.length;
    sections[lang] = source.slice(start, end).trim();
  });

  const targetLang = lang === "ko" ? "ko" : "en";
  return sections[targetLang] || sections.ko || sections.en || "";
}

function renderMarkdown(markdown = "", title = "", context = {}) {
  const lines = normalizeMarkdownSource(markdown, context.lang || getSiteLanguage()).split("\n");
  const blocks = [];
  let paragraphLines = [];
  let quoteLines = [];
  let listItems = [];
  let listOrdered = false;
  let codeLines = null;

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    blocks.push(createMarkdownParagraph(paragraphLines, context));
    paragraphLines = [];
  };

  const flushQuote = () => {
    if (!quoteLines.length) return;
    blocks.push(createMarkdownQuote(quoteLines, context));
    quoteLines = [];
  };

  const flushList = () => {
    if (!listItems.length) return;
    blocks.push(createMarkdownList(listItems, listOrdered, context));
    listItems = [];
  };

  const flushTextBlocks = () => {
    flushParagraph();
    flushQuote();
    flushList();
  };

  lines.forEach((rawLine, index) => {
    const trimmed = rawLine.trim();
    const isFirstTitle = index === 0 && title && trimmed === `# ${title}`;

    if (isFirstTitle) return;

    if (codeLines) {
      if (trimmed.startsWith("```")) {
        blocks.push(createMarkdownCodeBlock(codeLines));
        codeLines = null;
      } else {
        codeLines.push(rawLine);
      }
      return;
    }

    if (trimmed.startsWith("```")) {
      flushTextBlocks();
      codeLines = [];
      return;
    }

    if (!trimmed) {
      flushTextBlocks();
      return;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushTextBlocks();
      blocks.push(createMarkdownHeading(headingMatch[1].length, headingMatch[2], context));
      return;
    }

    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushTextBlocks();
      blocks.push(createMarkdownDivider());
      return;
    }

    const quoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      quoteLines.push(quoteMatch[1]);
      return;
    }

    const listMatch = getMarkdownListMatch(trimmed);
    if (listMatch) {
      flushParagraph();
      flushQuote();
      if (listItems.length && listOrdered !== listMatch.ordered) flushList();
      listOrdered = listMatch.ordered;
      listItems.push(listMatch.text);
      return;
    }

    if (/^!\[[^\]]*\]\([^)]+\)$/.test(trimmed)) {
      flushTextBlocks();
      blocks.push(createMarkdownMediaBlock(trimmed, context));
      return;
    }

    flushQuote();
    flushList();
    paragraphLines.push(trimmed);
  });

  flushTextBlocks();
  if (codeLines) blocks.push(createMarkdownCodeBlock(codeLines));
  return blocks;
}

function createNovelReaderMedia(item, title) {
  const assets = getNovelProjectAssets(item);
  if (assets.length === 0) return null;

  const gallery = document.createElement("section");
  gallery.className = "novel-project-media";
  gallery.setAttribute("aria-label", `${title} media`);

  assets.forEach((asset) => {
    const link = document.createElement("a");
    link.href = projectHref(asset);
    link.target = "_blank";
    link.rel = "noreferrer";
    link.className = "novel-project-media-item";
    link.append(createGalleryMedia(asset, title));
    gallery.append(link);
  });

  return gallery;
}

function renderMarkdownFileReader(path, title, parentItem = null, shouldOpen = false, options = {}) {
  if (!path || !readerTitle || !readerSource || !readerContent) return;
  setReaderVariant("");
  if (shouldOpen || options.preserveLanguage) {
    prepareReaderLanguage(parentItem, { preserveLanguage: options.preserveLanguage });
  }
  currentReader = {
    type: "chapter",
    id: path,
    path,
    title,
    parentId: parentItem?.id || "",
  };

  readerTitle.textContent = title;
  readerSource.href = projectHref(path);
  readerSource.textContent = "";
  readerSource.target = "_blank";
  readerSource.rel = "noreferrer";

  if (shouldOpen) openReader();

  fetch(projectHref(path))
    .then((response) => {
      if (!response.ok) throw new Error("chapter not found");
      return response.text();
    })
    .then((markdown) => {
      if (currentReader.type !== "chapter" || currentReader.path !== path) return;
      const markdownNodes = renderMarkdown(markdown, title, {
        item: parentItem,
        basePath: path,
        lang: getReaderLanguage(),
      });
      readerContent.replaceChildren(...markdownNodes);
      if (options.scrollState) restoreReaderScrollState(options.scrollState);
      else readerContent.scrollTop = 0;
      updateReaderBackState();
    })
    .catch(() => {
      if (currentReader.type !== "chapter" || currentReader.path !== path) return;
      const error = document.createElement("p");
      error.className = "markdown-block";
      error.textContent = getReaderLanguage() === "ko"
        ? "파일을 불러올 수 없습니다."
        : "Unable to load this file.";
      readerContent.replaceChildren(error);
    });
}

function renderMarkdownReader(id, shouldOpen = false, options = {}) {
  const item = findContentById(id) || contentItems[0];
  if (!item || !readerTitle || !readerSource || !readerContent) return;
  setReaderVariant("");
  if (shouldOpen || options.preserveLanguage) {
    prepareReaderLanguage(item, { preserveLanguage: options.preserveLanguage });
  }
  currentReader = { type: "content", id: item.id };

  const readerLanguage = getReaderLanguage();
  const title = getLocalizedTitle(item, readerLanguage);
  readerTitle.textContent = title;
  readerSource.href = projectHref(item.path);
  readerSource.textContent = "";
  readerSource.target = "_blank";
  readerSource.rel = "noreferrer";

  const markdownNodes = renderMarkdown(getLocalizedMarkdown(item, readerLanguage), title, {
    item,
    basePath: item.path,
    lang: readerLanguage,
  });
  const novelMedia = item.type === "novel" ? createNovelReaderMedia(item, title) : null;
  readerContent.replaceChildren(...[
    novelMedia,
    ...markdownNodes,
  ].filter(Boolean));
  if (options.scrollState) restoreReaderScrollState(options.scrollState);
  else readerContent.scrollTop = 0;
  updateReaderBackState();
  if (shouldOpen) {
    openReader();
  }
}

function renderPdfReader(id) {
  const item = findContentById(id);
  if (!item || !pdfTitle || !pdfSource || !pdfFrame || !item.meta?.pdf) return;

  currentReader = { type: "pdf", id: item.id };
  const title = getLocalizedTitle(item);
  pdfTitle.textContent = title;
  setPdfViewerSource(title, item.meta.pdf);
  openPdf();
}

function openPdfFile(title, pdfPath) {
  if (!pdfTitle || !pdfSource || !pdfFrame) return;
  currentReader = { type: "pdf", id: pdfPath };
  pdfTitle.textContent = title;
  setPdfViewerSource(title, pdfPath);
  openPdf();
}

function renderReader(id, shouldOpen = false) {
  const item = writings.find((writing) => writing.id === id) || writings[0];
  if (!item || !readerTitle || !readerSource || !readerContent) return;
  setReaderVariant("");
  currentReader = { type: "notion", id: item.id };

  readerTitle.textContent = item.title;
  readerSource.href = item.url;
  readerSource.textContent = "";
  readerSource.target = "_blank";
  readerSource.rel = "noreferrer";

  const nodes = item.blocks.map((block) => {
    if (block.type === "image" || block.type === "video") {
      return renderMediaBlock(block);
    }

    if (block.type === "page_link") {
      const row = document.createElement("p");
      const button = document.createElement("button");
      row.className = `notion-block notion-page-link depth-${Math.min(block.depth || 0, 3)}`;
      button.type = "button";
      button.textContent = block.title;
      button.addEventListener("click", () => renderReader(block.targetId, true));
      row.append(button);
      return row;
    }

    const element = document.createElement(block.type === "header" ? "h3" : "p");
    element.className = `notion-block depth-${Math.min(block.depth || 0, 3)}`;
    (block.parts || [{ text: block.text || "" }]).forEach((part) => {
      element.append(renderInlinePart(part));
    });
    return element;
  });

  readerContent.replaceChildren(...nodes);
  readerContent.scrollTop = 0;
  if (shouldOpen) {
    openReader();
  }
}

function bindRolePanels() {
  rolePanels.forEach((panel) => {
    let hoverFrame = null;
    panel.addEventListener("pointerenter", () => {
      if (hoverFrame) cancelAnimationFrame(hoverFrame);
      if (!document.body.classList.contains("role-focus")) {
        rolePanels.forEach((item) => item.classList.remove("is-hovered"));
        rolePanels.forEach((item) => item.classList.toggle("is-hovered", item === panel));
      }
    });
    panel.addEventListener("pointerleave", () => {
      hoverFrame = requestAnimationFrame(() => {
        rolePanels.forEach((item) => item.classList.remove("is-hovered"));
        panel.querySelector(".role-hit")?.blur();
        hoverFrame = null;
      });
    });
    panel.addEventListener("click", (event) => {
      if (event.target.closest(".role-detail")) return;
      if (document.body.classList.contains("reader-open") || document.body.classList.contains("pdf-open")) return;
      if (document.body.classList.contains("role-closing")) return;
      if (!isRoleRoomPage) {
        const roomPath = roleRoomPaths[panel.dataset.rolePanel];
        if (roomPath) {
          window.location.href = roomPath;
          return;
        }
      }
      window.clearTimeout(roleReadyTimer);
      rolePanels.forEach((item) => item.classList.remove("is-hovered", "is-detail-ready"));
      document.body.classList.remove("role-closing");
      rolePanels.forEach((item) => item.classList.toggle("is-expanded", item === panel));
      document.body.classList.add("role-focus");
      roleReadyTimer = window.setTimeout(() => {
        if (!panel.classList.contains("is-expanded") || !document.body.classList.contains("role-focus")) return;
        panel.classList.add("is-detail-ready");
        positionNovelOrbitCards();
      }, ROLE_DETAIL_READY_MS);
      requestAnimationFrame(positionNovelOrbitCards);
    });
  });

}

closeReaderControls.forEach((control) => {
  control.addEventListener("click", closeReader);
});

readerBackControl?.addEventListener("click", goBackReader);

closePdfControls.forEach((control) => {
  control.addEventListener("click", closePdf);
});

if (readerContent) {
  ["copy", "cut", "contextmenu"].forEach((eventName) => {
    readerContent.addEventListener(eventName, (event) => event.preventDefault());
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (galleryOriginalModal?.classList.contains("is-open")) {
      closeGalleryOriginal();
      return;
    }
    setV15MenuState(false);
    closeReader();
    closePdf();
  }
});

window.addEventListener("scroll", updateIntroScroll, { passive: true });
window.addEventListener("resize", updateIntroScroll);
window.addEventListener("resize", refreshGalleryMasonryOnResize);
window.addEventListener("hashchange", restoreExploreHash);

bindReaderSetting(readerLang, "lang");
bindReaderSetting(readerSize, "size");
bindReaderSetting(readerSpacing, "spacing");
bindReaderSetting(readerTheme, "theme");
bindModalTouchScrollGuard(readerModal, readerContent);
bindReaderManualTouchScroll(readerContent);
languageControls.forEach((control) => {
  control.addEventListener("click", () => setLanguage(control.dataset.language));
});
applyReaderSettings();
refreshLocalizedContent();
bindV15Menu();
bindRolePanels();
updateIntroScroll();
restoreExploreHash();
if (contentItems[0]) {
  renderMarkdownReader(contentItems[0].id);
}
