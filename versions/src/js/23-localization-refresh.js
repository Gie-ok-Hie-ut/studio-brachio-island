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
  const isGallery = variant === "gallery";
  readerWindow.classList.toggle("popup-window-gallery", isGallery);
  readerContent?.classList.toggle("popup-content-gallery", isGallery);
  readerWindow.dataset.popupVariant = variant || "reader";
}

let studioLanguageChangeVersion = 0;
let pendingStudioLanguageChange = null;

async function requestStudioLanguageChange(change) {
  const version = ++studioLanguageChangeVersion;
  const target = {
    siteLanguage: getSiteLanguage(),
    readerLanguage: activeReaderLanguage,
    refreshSite: false,
    readerOrigin: null,
    ...pendingStudioLanguageChange,
    ...change,
  };
  pendingStudioLanguageChange = target;
  // A select changes its value before its handler runs. Keep it consistent with
  // the text that remains visible while the new language's subsets are loading.
  if (readerLang) readerLang.value = getReaderLanguage();

  const deadline = Date.now() + 8000;
  let context;
  do {
    if (target.readerOrigin && (target.readerOrigin !== currentReader ||
        !readerModal?.classList.contains("is-open"))) {
      if (!target.refreshSite) {
        pendingStudioLanguageChange = null;
        return;
      }
      target.readerLanguage = "";
      target.readerOrigin = null;
    }
    context = getStudioLanguageFontContext();
    await prepareStudioLanguageFonts(target.siteLanguage, target.readerLanguage, deadline);
    if (version !== studioLanguageChangeVersion) return;
    // Opening a different work during a site-language request adds different
    // characters. Prepare those too before committing the latest selection.
  } while (context !== getStudioLanguageFontContext() && Date.now() < deadline);

  pendingStudioLanguageChange = null;
  if (target.readerOrigin && (target.readerOrigin !== currentReader ||
      !readerModal?.classList.contains("is-open"))) {
    if (!target.refreshSite) return;
    target.readerLanguage = "";
  }
  const scrollState = getReaderScrollState();
  readerSettings.lang = target.siteLanguage;
  activeReaderLanguage = target.readerLanguage;
  applyReaderSettings({ persist: target.refreshSite });
  if (target.refreshSite) {
    refreshLocalizedContent({ preserveReaderScroll: true, scrollState });
  } else {
    refreshCurrentReaderContent(scrollState);
  }
}

function setLanguage(lang) {
  return requestStudioLanguageChange({
    siteLanguage: lang === "ko" ? "ko" : "en",
    readerLanguage: "",
    refreshSite: true,
    readerOrigin: null,
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
