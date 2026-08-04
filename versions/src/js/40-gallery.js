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

function getGalleryProjectMetaText(item) {
  return [item.meta?.year, item.meta?.medium]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" / ");
}

function normalizeGalleryDetailText(value = "") {
  return String(value)
    .replace(/[#*_`>\[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getGalleryProjectDetailMarkdown(item, lang) {
  const detail = String(getLocalizedMarkdown(item, lang) || "").trim();
  if (!detail) return "";

  const normalizedDetail = normalizeGalleryDetailText(detail);
  const metadataValues = [item.meta?.year, item.meta?.medium]
    .map(normalizeGalleryDetailText)
    .filter(Boolean);

  return metadataValues.includes(normalizedDetail) ? "" : detail;
}

function openGalleryProject(item, startIndex = 0, options = {}) {
  if (!readerTitle || !readerSource || !readerContent) return;
  prepareReaderLanguage(item, { preserveLanguage: options.preserveLanguage });
  const readerLanguage = getReaderLanguage();
  const title = getLocalizedTitle(item, readerLanguage);
  const assets = getGalleryProjectAssets(item);
  const metadataText = getGalleryProjectMetaText(item);
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
  const infoMeta = document.createElement("p");
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
  infoMeta.className = "gallery-project-info-meta";
  infoMeta.textContent = metadataText;
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
    const detail = getGalleryProjectDetailMarkdown(item, readerLanguage);
    const hasDetail = Boolean(detail);
    navCounter.textContent = total > 1 ? `${paddedIndex} OF ${paddedTotal}` : "";
    info.hidden = !metadataText && !hasDetail;
    info.classList.toggle("has-detail", hasDetail);
    infoToggle.hidden = !hasDetail;
    detailBody.hidden = !hasDetail;
    if (detail) {
      detailBody.replaceChildren(...renderMarkdown(detail, title, {
        item,
        basePath: item.path,
        lang: readerLanguage,
      }));
    } else {
      info.classList.remove("is-open");
      infoToggle.setAttribute("aria-expanded", "false");
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

  info.append(infoMeta, infoToggle, detailBody);
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
