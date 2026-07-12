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
const closeReaderControls = document.querySelectorAll("[data-close-reader]");
const closePdfControls = document.querySelectorAll("[data-close-pdf]");
const ROLE_FADE_MS = 760;
const ROLE_DETAIL_READY_MS = 360;
const introScreen = document.querySelector(".intro-screen");
const rolePanels = document.querySelectorAll("[data-role-panel]");
const activeRoleRoom = document.body.dataset.roleRoom || "";
const roleRoomTarget = document.querySelector("[data-role-room-target]");
const isRoleRoomPage = Boolean(activeRoleRoom);
const projectRoot = isRoleRoomPage ? "../../" : "../";
const roleRoomPaths = {
  identity: "rooms-v14/who-are-we.html",
  engineer: "rooms-v14/ai-research.html",
  novel: "rooms-v14/novel.html",
  visual: "rooms-v14/visual-art.html",
  aesthetics: "rooms-v14/essay.html",
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
const novelOrbit = {
  angle: 0,
  direction: 0.14,
  frame: null,
  lastTime: 0,
  pressedDirection: 0,
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
let currentReader = {
  type: "",
  id: "",
};
let roleReadyTimer = 0;

const staticCopy = {
  "#reader-title": { en: "Select a text", ko: "글을 선택하세요" },
  "#pdf-title": { en: "Select a PDF", ko: "PDF를 선택하세요" },
};

function applyStaticCopy() {
  const lang = readerSettings.lang === "ko" ? "ko" : "en";
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

function refreshLocalizedContent() {
  applyStaticCopy();
  renderRoleShells();
  renderRoleItems();
  bindNovelOrbitControls();
  if (currentReader.type === "content") {
    renderMarkdownReader(currentReader.id);
  }
  if (currentReader.type === "pdf") {
    const item = findContentById(currentReader.id);
    if (item && pdfTitle) pdfTitle.textContent = getLocalizedTitle(item);
  }
}

function setLanguage(lang) {
  readerSettings.lang = lang === "ko" ? "ko" : "en";
  applyReaderSettings();
  refreshLocalizedContent();
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

function getLocalizedTitle(item) {
  if (!item) return "";
  if (readerSettings.lang === "en") return item.titleEn || item.titleKo || item.title;
  return item.titleKo || item.title || item.titleEn;
}

function getLocalizedMarkdown(item) {
  if (!item) return "";
  if (readerSettings.lang === "en") return item.markdownEn || item.markdownKo || item.markdown || "";
  return item.markdownKo || item.markdown || item.markdownEn || "";
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
  const card = document.createElement("article");
  const label = document.createElement("span");
  const title = document.createElement("strong");
  const tags = document.createElement("span");
  const meta = document.createElement("em");
  const options = document.createElement("span");
  const notionButton = document.createElement("button");

  card.className = originalIndex % 3 === 1 ? "novel-card novel-card-blue" : "novel-card";
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
  title.textContent = getLocalizedTitle(item);
  tags.className = "novel-card-tags";
  tags.textContent = (item.meta?.tags || []).slice(0, 3).join(" ");
  meta.textContent = "MARKDOWN NOVEL";
  options.className = "novel-card-actions";
  notionButton.type = "button";
  notionButton.textContent = "Notion";
  notionButton.disabled = !notionItem;
  notionButton.addEventListener("click", (event) => {
    event.stopPropagation();
    if (notionItem) renderReader(notionItem.id, true);
  });

  options.append(notionButton);
  card.append(label, title, tags, meta, options);
  return card;
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
  const roleNovelStage = document.querySelector("#role-novel-items");
  return [roleNovelStage].filter((container) => container && container.querySelector(".novel-card"));
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
    const radius = Math.min(deckWidth * (isRoleNovelStage ? 0.68 : 0.72), isRoleNovelStage ? 760 : 820);
    const verticalRadius = Math.min(radius, deckHeight * (isRoleNovelStage ? 0.72 : 0.94));
    const visibleLimit = isRoleNovelStage ? 98 : 86;
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
  const speed = novelOrbit.pressedDirection || novelOrbit.direction;
  novelOrbit.angle = normalizeAngle(novelOrbit.angle + speed * delta * 0.018);
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

function rotateNovelOrbit(direction) {
  const step = 24;
  novelOrbit.angle = normalizeAngle(novelOrbit.angle + direction * step);
  novelOrbit.direction = direction * 0.14;
  positionNovelOrbitCards();
}

function bindNovelOrbitControls() {
  [...document.querySelectorAll("[data-novel-rotate]"), ...document.querySelectorAll("[data-role-novel-rotate]")].forEach((control) => {
    if (control.dataset.orbitBound === "true") return;
    control.dataset.orbitBound = "true";
    const direction = Number(control.dataset.novelRotate) || 1;
    const roleDirection = Number(control.dataset.roleNovelRotate);
    const activeDirection = Number.isNaN(roleDirection) ? direction : roleDirection;
    control.addEventListener("click", () => rotateNovelOrbit(activeDirection));
    control.addEventListener("pointerdown", () => {
      novelOrbit.pressedDirection = activeDirection * 0.9;
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach((eventName) => {
      control.addEventListener(eventName, () => {
        novelOrbit.pressedDirection = 0;
      });
    });
  });
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
      detailBody.replaceChildren(...renderMarkdown(markdown, ""));
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
    const markNode = document.createElement("span");
    const textNode = document.createElement("span");
    const handleText = String(handle).trim();
    handleNode.className = "role-heading-handle";
    markNode.className = "role-heading-mark";
    textNode.className = "role-heading-handle-text";
    markNode.textContent = handleText.startsWith("@") ? "@" : "";
    textNode.textContent = handleText.replace(/^@/, "").trim();
    handleNode.append(markNode, textNode);
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

function renderRoleMarkdownNote(markdown = "", body) {
  const introLines = getRecordIntro(markdown);
  if (introLines.length === 0) return;

  const intro = document.createElement("p");
  intro.className = "role-intro cv-intro";
  intro.textContent = introLines.join(" ");
  body.append(intro);
}

function parseRecordSections(markdown = "") {
  const sections = [];
  let current = null;

  markdown.replace(/\r\n/g, "\n").split("\n").forEach((rawLine) => {
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
  const normalized = markdown.replace(/\r\n/g, "\n");
  const firstHeadingIndex = normalized.search(/^##\s+/m);
  const intro = firstHeadingIndex === -1 ? normalized : normalized.slice(0, firstHeadingIndex);
  return intro
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
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
  const statement = document.createElement("p");
  const figure = document.createElement("figure");
  const image = document.createElement("img");
  const caption = document.createElement("figcaption");
  const introLines = getRecordIntro(getLocalizedMarkdown(item));

  body.classList.add("identity-detail");
  statement.className = "identity-statement role-intro cv-intro";
  statement.textContent = introLines.join(" ");

  figure.className = "identity-detail-portrait";
  image.src = projectHref(item.meta?.image || "../assets/identity-portrait.png");
  image.alt = item.meta?.caption || getMetaText(item, "detailTitle", item.title);
  image.loading = "lazy";
  caption.textContent = item.meta?.caption || "";

  figure.append(image, caption);
  body.append(statement, figure);
}

function renderCvRole(item, body) {
  const wrapper = document.createElement("div");
  const introLines = getRecordIntro(getLocalizedMarkdown(item));
  wrapper.className = "engineer-scroll cv-scroll";

  if (introLines.length > 0) {
    const intro = document.createElement("p");
    intro.className = "cv-intro";
    intro.textContent = introLines.join(" ");
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
        title.textContent = row.text;
        text.append(title);
        if (row.detail) {
          const detail = document.createElement("small");
          detail.className = "cv-entry-detail";
          detail.textContent = row.detail;
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
  renderRoleMarkdownNote(getLocalizedMarkdown(item), body);
  const target = document.createElement("div");
  target.id = "role-visual-items";
  target.className = "role-items role-gallery-items";
  body.append(target);
}

function renderNovelRole(item, body) {
  renderRoleMarkdownNote(getLocalizedMarkdown(item), body);
  const controls = document.createElement("div");
  const left = document.createElement("button");
  const right = document.createElement("button");
  const target = document.createElement("div");

  controls.className = "novel-controls role-novel-controls";
  controls.setAttribute("aria-label", "Novel carousel controls");
  left.type = "button";
  left.dataset.roleNovelRotate = "-1";
  left.setAttribute("aria-label", "Rotate novels left");
  left.textContent = "←";
  right.type = "button";
  right.dataset.roleNovelRotate = "1";
  right.setAttribute("aria-label", "Rotate novels right");
  right.textContent = "→";
  target.id = "role-novel-items";
  target.className = "role-novel-stage novel-deck";

  controls.append(left, right);
  body.append(controls, target);
}

function renderReadingRole(item, body) {
  renderRoleMarkdownNote(getLocalizedMarkdown(item), body);
  const target = document.createElement("div");
  target.id = "role-aesthetics-items";
  target.className = "role-items role-paper-items";
  body.append(target);
}

function renderRoleBody(item, body) {
  const layout = item.meta?.layout || "note";
  if (layout === "identity") renderIdentityRole(item, body);
  else if (layout === "cv") renderCvRole(item, body);
  else if (layout === "gallery") renderGalleryRole(item, body);
  else if (layout === "novel") renderNovelRole(item, body);
  else if (layout === "reading") renderReadingRole(item, body);
  else body.replaceChildren(...renderMarkdown(getLocalizedMarkdown(item), getLocalizedTitle(item)));
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
  const close = document.createElement("a");
  const title = document.createElement("div");
  const body = document.createElement("div");
  const detailText = getMetaText(item, "detailTitle", getLocalizedTitle(item));
  const handle = getMetaText(item, "handle", item.meta?.handle || "");

  detail.className = `role-detail role-detail-layout-${item.meta?.layout || "note"} role-room-detail`;
  close.className = "role-close role-room-back";
  close.href = "../version-14.html#explore";
  close.setAttribute("aria-label", "Back to Studio Hall");
  close.textContent = "×";

  title.className = "role-section-title";
  title.append(createRoleHeading(detailText, handle, "h2"));
  renderProfileLinks(item, title, detailText);

  body.className = `role-section-body role-section-body-${item.meta?.layout || "note"}`;
  body.dataset.roleBody = activeRoleRoom;
  renderRoleBody(item, body);

  detail.append(close, title, body);
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
  const novelTarget = document.querySelector("#role-novel-items");
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
    visualTarget.replaceChildren(
      ...galleryAssetFiles.map(createGalleryAssetButton)
    );
  }

  if (novelTarget) {
    novelTarget.replaceChildren(
      ...getVisualNovelItems(18).map((item, index) => createNovelCard(item, index))
    );
    startNovelOrbit();
  }

  if (aestheticsTarget) {
    const readingItems = topLevelEssayItems.filter((item) => item.id === "complete-artist-linear-art");
    aestheticsTarget.replaceChildren(
      ...readingItems.map((item, index) =>
        createRoleItemButton(getLocalizedTitle(item), () => {
          if (item.meta?.format === "pdf") {
            renderPdfReader(item.id);
          } else {
            renderMarkdownReader(item.id, true);
          }
        }, { kicker: `${item.type} ${String(index + 1).padStart(2, "0")}` })
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

function applyReaderSettings() {
  if (!readerWindow) return;
  readerWindow.dataset.lang = readerSettings.lang;
  readerWindow.dataset.size = readerSettings.size;
  readerWindow.dataset.spacing = readerSettings.spacing;
  readerWindow.dataset.theme = readerSettings.theme;

  if (readerLang) readerLang.value = readerSettings.lang;
  if (readerSize) readerSize.value = readerSettings.size;
  if (readerSpacing) readerSpacing.value = readerSettings.spacing;
  if (readerTheme) readerTheme.value = readerSettings.theme;

  saveReaderSettings();
}

function bindReaderSetting(control, key) {
  if (!control) return;
  control.addEventListener("change", () => {
    if (key === "lang") {
      setLanguage(control.value);
      return;
    }
    readerSettings[key] = control.value;
    applyReaderSettings();
    refreshLocalizedContent();
  });
}

function closeReader() {
  if (!readerModal) return;
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
}

function appendMarkdownInline(parent, text) {
  const pattern = /(!)?\[([^\]]+)\]\(([^)]+)\)/g;
  let cursor = 0;
  let match = pattern.exec(text);

  while (match) {
    if (match.index > cursor) {
      parent.append(document.createTextNode(text.slice(cursor, match.index)));
    }

    const [, isImage, label, href] = match;
    if (isImage) {
      const image = document.createElement("img");
      image.src = projectHref(href);
      image.alt = label;
      image.loading = "lazy";
      parent.append(image);
    } else if (href.startsWith("notion:")) {
      const contentItem = findContentByHref(href);
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.addEventListener("click", () => {
        if (contentItem) renderMarkdownReader(contentItem.id, true);
      });
      button.disabled = !contentItem;
      parent.append(button);
    } else {
      const link = document.createElement("a");
      link.href = projectHref(href);
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = label;
      parent.append(link);
    }

    cursor = pattern.lastIndex;
    match = pattern.exec(text);
  }

  if (cursor < text.length) {
    parent.append(document.createTextNode(text.slice(cursor)));
  }
}

function createMarkdownBlock(lines) {
  const text = lines.join(" ").trim();
  if (!text) return null;

  if (text.startsWith("## ")) {
    const heading = document.createElement("h3");
    appendMarkdownInline(heading, text.slice(3));
    return heading;
  }

  if (text.startsWith("# ")) {
    const heading = document.createElement("h3");
    appendMarkdownInline(heading, text.slice(2));
    return heading;
  }

  if (/^!?\[[^\]]+\]\([^)]+\)$/.test(text) && text.startsWith("!")) {
    const figure = document.createElement("figure");
    figure.className = "notion-media markdown-media";
    appendMarkdownInline(figure, text);
    return figure;
  }

  const paragraph = document.createElement("p");
  paragraph.className = "markdown-block";
  appendMarkdownInline(paragraph, text);
  return paragraph;
}

function renderMarkdown(markdown = "", title = "") {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let buffer = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const isFirstTitle = index === 0 && trimmed === `# ${title}`;

    if (isFirstTitle) return;
    if (!trimmed) {
      const block = createMarkdownBlock(buffer);
      if (block) blocks.push(block);
      buffer = [];
      return;
    }

    if (trimmed.startsWith("# ") || trimmed.startsWith("## ") || trimmed.startsWith("![")) {
      const block = createMarkdownBlock(buffer);
      if (block) blocks.push(block);
      buffer = [trimmed];
      return;
    }

    buffer.push(trimmed);
  });

  const lastBlock = createMarkdownBlock(buffer);
  if (lastBlock) blocks.push(lastBlock);
  return blocks;
}

function renderMarkdownReader(id, shouldOpen = false) {
  const item = findContentById(id) || contentItems[0];
  if (!item || !readerTitle || !readerSource || !readerContent) return;
  currentReader = { type: "content", id: item.id };

  const title = getLocalizedTitle(item);
  readerTitle.textContent = title;
  readerSource.href = projectHref(item.path);
  readerSource.textContent = "";
  readerSource.target = "_blank";
  readerSource.rel = "noreferrer";

  readerContent.replaceChildren(...renderMarkdown(getLocalizedMarkdown(item), title));
  readerContent.scrollTop = 0;
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
  pdfSource.href = projectHref(item.meta.pdf);
  pdfSource.target = "_blank";
  pdfSource.rel = "noreferrer";
  pdfFrame.src = projectHref(item.meta.pdf);
  pdfFrame.title = title;
  openPdf();
}

function openPdfFile(title, pdfPath) {
  if (!pdfTitle || !pdfSource || !pdfFrame) return;
  currentReader = { type: "pdf", id: pdfPath };
  pdfTitle.textContent = title;
  pdfSource.href = projectHref(pdfPath);
  pdfSource.target = "_blank";
  pdfSource.rel = "noreferrer";
  pdfFrame.src = projectHref(pdfPath);
  pdfFrame.title = title;
  openPdf();
}

function renderReader(id, shouldOpen = false) {
  const item = writings.find((writing) => writing.id === id) || writings[0];
  if (!item || !readerTitle || !readerSource || !readerContent) return;
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

closePdfControls.forEach((control) => {
  control.addEventListener("click", closePdf);
});

if (readerContent) {
  ["copy", "cut", "contextmenu", "selectstart"].forEach((eventName) => {
    readerContent.addEventListener(eventName, (event) => event.preventDefault());
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeReader();
    closePdf();
  }
});

window.addEventListener("scroll", updateIntroScroll, { passive: true });
window.addEventListener("resize", updateIntroScroll);
window.addEventListener("hashchange", restoreExploreHash);

bindReaderSetting(readerLang, "lang");
bindReaderSetting(readerSize, "size");
bindReaderSetting(readerSpacing, "spacing");
bindReaderSetting(readerTheme, "theme");
languageControls.forEach((control) => {
  control.addEventListener("click", () => setLanguage(control.dataset.language));
});
applyReaderSettings();
refreshLocalizedContent();
bindRolePanels();
updateIntroScroll();
restoreExploreHash();
if (contentItems[0]) {
  renderMarkdownReader(contentItems[0].id);
}
