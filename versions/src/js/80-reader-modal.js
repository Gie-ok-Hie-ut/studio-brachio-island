function normalizePopupOptions(options = {}) {
  return options instanceof Event ? {} : options;
}

function resetPopupChromeState() {
  rolePanels.forEach((panel) => panel.classList.remove("is-hovered"));
  document.body.classList.remove("role-closing");
  sharePopupControls.forEach((control) => setPopupShareFeedback(control, ""));
}

function openPopupModal(modal, bodyClass, options = {}) {
  const normalizedOptions = normalizePopupOptions(options);
  if (!modal) return false;
  resetPopupChromeState();
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add(bodyClass);
  if (!normalizedOptions.skipUrl) updatePopupHash();
  return true;
}

function closePopupModal(modal, bodyClass, options = {}) {
  const normalizedOptions = normalizePopupOptions(options);
  if (!modal) return false;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove(bodyClass);
  if (!normalizedOptions.preserveUrl) clearPopupHash({ replace: true });
  return true;
}

function openReader(options = {}) {
  if (!openPopupModal(readerModal, "reader-open", options)) return;
  scheduleReaderScrollIndicatorUpdate();
}

function openPdf(options = {}) {
  openPopupModal(pdfModal, "pdf-open", options);
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
  scheduleReaderScrollIndicatorUpdate();
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
    updateReaderScrollIndicator();
    event.preventDefault();
  }, { passive: false });
}

function closeReader(options = {}) {
  if (!readerModal) return;
  closeGalleryOriginal();
  setReaderVariant("");
  activeReaderLanguage = "";
  readerHistory = [];
  updateReaderBackState();
  closePopupModal(readerModal, "reader-open", options);
  readerWindow?.classList.remove("has-reader-scroll");
}

function closePdf(options = {}) {
  if (!pdfModal) return;
  closePopupModal(pdfModal, "pdf-open", options);
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
