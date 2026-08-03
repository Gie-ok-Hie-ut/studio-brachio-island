/* Reader scroll state, inline navigation history, and back control. */
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
