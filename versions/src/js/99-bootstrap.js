/* Page-level event binding and startup sequence. */
function initializeStudioPage() {
  closeReaderControls.forEach((control) => {
    control.addEventListener("click", closeReader);
  });

  readerBackControl?.addEventListener("click", goBackReader);

  sharePopupControls.forEach((control) => {
    control.addEventListener("click", shareCurrentPopup);
  });

  closePdfControls.forEach((control) => {
    control.addEventListener("click", closePdf);
  });

  if (readerContent) {
    ["copy", "cut", "contextmenu"].forEach((eventName) => {
      readerContent.addEventListener(eventName, (event) => event.preventDefault());
    });
    readerContent.addEventListener("scroll", updateReaderScrollIndicator, { passive: true });
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
  window.addEventListener("resize", scheduleReaderScrollIndicatorUpdate);
  window.addEventListener("hashchange", () => {
    if (syncPopupFromUrl()) return;
    restoreExploreHash();
    revealDeepLinkedContent();
  });
  window.addEventListener("popstate", () => {
    if (syncPopupFromUrl()) return;
    restoreExploreHash();
    revealDeepLinkedContent();
  });

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
  const openedPopupFromUrl = syncPopupFromUrl();
  if (!openedPopupFromUrl && contentItems[0]) {
    renderMarkdownReader(contentItems[0].id);
  }
}

initializeStudioPage();
