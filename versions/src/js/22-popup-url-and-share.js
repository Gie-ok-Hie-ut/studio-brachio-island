/* Popup URL hash synchronization and share behavior. */
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
