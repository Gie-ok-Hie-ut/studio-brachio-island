
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
  scheduleReaderScrollIndicatorUpdate();

  fetch(descriptionPath)
    .then((response) => (response.ok ? response.text() : ""))
    .then((markdown) => {
      if (currentReader.type !== "asset" || currentReader.id !== filename || !markdown.trim()) return;
      detailBody.replaceChildren(...renderMarkdown(markdown, "", {
        basePath: `content/gallery/assets/${filename.replace(/\.[^.]+$/, ".md")}`,
      }));
      scheduleReaderScrollIndicatorUpdate();
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
    const detail = String(getLocalizedMarkdown(item, readerLanguage) || "").trim();
    navCounter.textContent = total > 1 ? `${paddedIndex} OF ${paddedTotal}` : "";
    if (detail) {
      detailBody.replaceChildren(...renderMarkdown(detail, title, {
        item,
        basePath: item.path,
        lang: readerLanguage,
      }));
    } else {
      detailBody.replaceChildren();
    }
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
    scheduleReaderScrollIndicatorUpdate();
    if (!options.skipUrl && readerModal?.classList.contains("is-open")) {
      updatePopupHash({ replace: true });
    }
  };

  previousButton.addEventListener("click", () => setActiveAsset(activeIndex - 1));
  nextButton.addEventListener("click", () => setActiveAsset(activeIndex + 1));
  infoToggle.addEventListener("click", () => {
    const isOpen = info.classList.toggle("is-open");
    infoToggle.setAttribute("aria-expanded", String(isOpen));
    scheduleReaderScrollIndicatorUpdate();
  });

  info.append(infoToggle, detailBody);
  navRow.append(previousButton, navCounter, nextButton);
  stage.append(figure, navRow);
  wrapper.append(stage, info);
  setActiveAsset(activeIndex);
  readerContent.replaceChildren(wrapper);
  if (options.scrollState) restoreReaderScrollState(options.scrollState);
  else readerContent.scrollTop = 0;
  openReader({ skipUrl: options.skipUrl });
  scheduleReaderScrollIndicatorUpdate();
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
  group.id = getContentAnchorId(item);
  group.dataset.contentId = item.id;
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
