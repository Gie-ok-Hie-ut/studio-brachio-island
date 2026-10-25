/* Load the subsets used by the rendered page before its first visible paint. */
async function loadRenderedStudioFonts() {
  if (!document.fonts) return;

  const runs = new Map();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const element = node.parentElement;
    const text = node.textContent;
    if (!text.trim() || !element ||
        element.closest("script, style, noscript, template, [hidden], [aria-hidden='true']") ||
        element.getClientRects().length === 0) continue;

    // visibility is intentionally hidden by the first-paint guard. innerText or
    // a visibility filter here would miss the Korean and dynamically built text.
    const style = getComputedStyle(element);
    if (!style.fontFamily.includes("Studio Pretendard")) continue;
    const descriptor = `${style.fontStyle} ${style.fontWeight} 16px "Studio Pretendard"`;
    if (!runs.has(descriptor)) runs.set(descriptor, new Set());
    for (const character of text) runs.get(descriptor).add(character);
  }

  await Promise.all([...runs].map(([descriptor, characters]) =>
    document.fonts.load(descriptor, [...characters].join(""))
  ));
  // Read a fresh ready promise after layout and explicit loads. This also covers
  // CSS-generated text; a promise captured before DOM rendering is insufficient.
  await document.fonts.ready;
}

async function finishInitialStudioFonts() {
  try {
    // A chapter opened by the initial URL can add its text asynchronously.
    await currentReader.ready;
    await loadRenderedStudioFonts();
    window.finishStudioFontLoading?.(true);
  } catch {
    // Preserve the existing error behavior until a new policy is chosen.
    window.finishStudioFontLoading?.(false);
  }
}

function getStudioLanguageFontContext() {
  return JSON.stringify([
    currentReader.type, currentReader.id, currentReader.path, currentReader.parentId,
    readerModal?.classList.contains("is-open"), pdfModal?.classList.contains("is-open"),
  ]);
}

function collectStudioItemFontText(item, lang, includeBody = false) {
  if (!item) return "";
  const meta = item.meta || {};
  const suffix = lang === "ko" ? "Ko" : "En";
  const text = [getLocalizedTitle(item, lang), ...getLocalizedTags(item, lang)];
  for (const key of ["panelTitle", "detailTitle", "handle", "kicker", "tagline", "summary", "caption", "year", "medium"]) {
    text.push(meta[`${key}${suffix}`] || meta[key] || "");
  }
  for (const resident of meta.residentImages || []) {
    text.push(lang === "ko"
      ? resident.labelKo || resident.label || resident.labelEn || ""
      : resident.labelEn || resident.label || resident.labelKo || "");
  }
  if (includeBody && getNovelBodyAccess(item) !== "withheld") {
    text.push(getLocalizedMarkdown(item, lang));
  }
  if (includeBody && item.type === "novel" && getNovelBodyAccess(item) !== "public") {
    text.push(...Object.values(getNovelWithheldCopy(lang)));
  }
  return text.join("\n");
}

function collectStudioPageLanguageText(lang) {
  const text = Object.values(staticCopy).map((copy) => copy[lang]);
  const roles = isRoleRoomPage ? [activeRoleRoom] : [...rolePanels].map((panel) => panel.dataset.rolePanel);
  for (const role of roles) {
    text.push(collectStudioItemFontText(getRoleItem(role), lang, true));
    const items = role === "visual" ? topLevelGalleryItems
      : role === "novel" ? topLevelNovelItems
        : role === "aesthetics" ? topLevelEssayItems : [];
    for (const item of items) text.push(collectStudioItemFontText(item, lang));
  }

  if (todaysSignalTarget) {
    const candidates = getTodaysSignalCandidates();
    const item = candidates.length ? pickTodaysSignalItem(candidates, getKstDateParts()) : null;
    if (item?.type === "paper") {
      // Paper signals are generated from the current language's CV rows. Read
      // only the corresponding target-language row, not the whole CV archive.
      const section = parseRecordSections(getLocalizedMarkdown(getRoleItem("engineer"), lang))
        .find((entry) => entry.title.toLowerCase() === "paper");
      const row = section?.rows[Number(item.order) - 1];
      if (row) text.push(row.label, row.text, row.detail, row.actions);
    } else {
      text.push(collectStudioItemFontText(item, lang, true));
    }
  }
  return text.join("\n");
}

function collectStudioReaderLanguageText(preferredLang) {
  const hasReader = readerModal?.classList.contains("is-open");
  const hasPdf = pdfModal?.classList.contains("is-open");
  if (!hasReader && !hasPdf) return "";
  const snapshot = currentReader;
  const item = snapshot.type === "chapter"
    ? findContentByPath(snapshot.path) || findContentById(snapshot.parentId)
    : findContentById(snapshot.id);
  const lang = hasPdf ? preferredLang : getDefaultReaderLanguage(item, preferredLang);
  const text = [collectStudioItemFontText(item, lang, hasReader)];
  if (snapshot.type === "chapter" && !findContentByPath(snapshot.path) && getNovelBodyAccess(item) !== "withheld") {
    // Unindexed files have no localized entry to consult. Reuse their current
    // text without adding a second content request during a language switch.
    text.push(readerTitle?.textContent || "", readerContent?.textContent || "");
    text.push(lang === "ko" ? "파일을 불러올 수 없습니다." : "Unable to load this file.");
  }
  return text.join("\n");
}

async function prepareStudioLanguageFonts(siteLanguage, readerLanguage, deadline) {
  if (!document.fonts || document.documentElement.classList.contains("is-font-unavailable")) return;
  const remaining = Math.max(0, deadline - Date.now());
  if (!remaining) return;
  let timer;
  try {
    const text = collectStudioPageLanguageText(siteLanguage) + "\n" +
      collectStudioReaderLanguageText(readerLanguage || siteLanguage);
    const characters = [...new Set(text)].join("");
    if (!characters.trim()) return;
    await Promise.race([
      document.fonts.load('400 16px "Studio Pretendard"', characters),
      new Promise((resolve) => { timer = setTimeout(resolve, remaining); }),
    ]);
  } catch {
    // A failed subset retains the browser's existing font fallback behavior.
  } finally {
    clearTimeout(timer);
  }
}
