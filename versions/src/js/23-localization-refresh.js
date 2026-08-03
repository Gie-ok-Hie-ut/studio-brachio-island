/* Site language switching and localized UI refresh. */
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
