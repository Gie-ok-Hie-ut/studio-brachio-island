function stripSignalMarkdown(markdown = "") {
  return normalizeMarkdownSource(markdown)
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/^\s*[-+]\s+/gm, "")
    .replace(/[`*_#>~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getKstDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});
  const year = parts.year || "2026";
  const month = parts.month || "01";
  const day = parts.day || "01";
  return {
    year,
    month,
    day,
    key: `${year}-${month}-${day}`,
    display: `${year}.${month}.${day}`,
  };
}

function hashString(value = "") {
  return String(value).split("").reduce((hash, char) => {
    const next = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
    return next >>> 0;
  }, 2166136261);
}

function getSignalNumber(dateParts) {
  const start = Date.UTC(2026, 0, 1);
  const today = Date.UTC(Number(dateParts.year), Number(dateParts.month) - 1, Number(dateParts.day));
  const dayIndex = Math.max(1, Math.floor((today - start) / 86400000) + 1);
  return String(dayIndex).padStart(3, "0");
}

function getSignalRoleMeta(item) {
  const roleMeta = {
    gallery: { role: "visual", category: "VISUAL ART", handle: "@NEOHEE" },
    novel: { role: "novel", category: "NOVEL", handle: "@ILLI" },
    essay: { role: "aesthetics", category: "ESSAY", handle: "@ALL" },
    paper: { role: "engineer", category: "PAPER", handle: "@LEE GUNHEE" },
  };
  return roleMeta[item?.type] || { role: "", category: String(item?.type || "WORK").toUpperCase(), handle: "" };
}

function getSignalImage(item) {
  if (!item) return "";
  if (item.type === "gallery") {
    const asset = getGalleryProjectAssets(item)[0];
    return asset ? getGalleryAssetPath(asset) : "";
  }
  if (item.type === "novel") {
    return getNovelCoverAsset(item);
  }
  return item.meta?.image || item.meta?.cover || "";
}

function isPdfSignal(item) {
  return item?.meta?.format === "pdf" || Boolean(item?.meta?.pdf);
}

function getPaperDescription(item) {
  const lines = normalizeMarkdownSource(getLocalizedMarkdown(item))
    .split("\n")
    .map((line) => stripSignalMarkdown(line))
    .filter(Boolean);
  return lines[lines.length - 1] || getLocalizedTitle(item);
}

function getTodaysSignalPreviewMode() {
  const params = new URLSearchParams(window.location.search);
  const value = params.get("signal") || params.get("todays");
  return String(value || "").trim().toLowerCase();
}

function pickTodaysSignalItem(candidates, dateParts) {
  const previewMode = getTodaysSignalPreviewMode();
  let pool = candidates;

  if (previewMode === "pdf") {
    const pdfItems = candidates.filter(isPdfSignal);
    if (pdfItems.length > 0) pool = pdfItems;
  } else if (previewMode) {
    const matchingItems = candidates.filter((item) => String(item.type || "").toLowerCase() === previewMode);
    if (matchingItems.length > 0) pool = matchingItems;
  }

  return pool[hashString(dateParts.key) % pool.length];
}

function getSignalDescription(item) {
  if (!item) return "";
  if (item.type === "paper") return getPaperDescription(item);

  const metaSummary = getMetaText(item, "summary", "");
  if (metaSummary) return stripSignalMarkdown(metaSummary);

  const intro = getRecordIntro(getLocalizedMarkdown(item))[0] || getLocalizedMarkdown(item);
  const clean = stripSignalMarkdown(intro);
  if (!clean) return getLocalizedTitle(item);
  const sentence = clean.match(/^(.+?[.!?。])\s/)?.[1] || clean;
  return sentence.length > 180 ? `${sentence.slice(0, 177).trim()}...` : sentence;
}

function getTodaysSignalCandidates() {
  return [
    ...topLevelGalleryItems,
    ...topLevelNovelItems,
    ...topLevelPaperItems,
    ...topLevelEssayItems,
  ]
    .filter((item) => item && item.topLevel !== false)
    .sort((a, b) => {
      const typeCompare = String(a.type).localeCompare(String(b.type));
      if (typeCompare) return typeCompare;
      const orderCompare = Number(a.order || 0) - Number(b.order || 0);
      if (orderCompare) return orderCompare;
      return String(a.id).localeCompare(String(b.id));
    });
}

function getSignalHref(item) {
  const roleMeta = getSignalRoleMeta(item);
  const rolePath = roleRoomPaths[roleMeta.role];
  if (!rolePath) return "#";
  return `${rolePath}#${getContentAnchorId(item)}`;
}

function renderTodaysSignal() {
  if (!todaysSignalTarget) return;
  const candidates = getTodaysSignalCandidates();
  if (candidates.length === 0) return;

  const dateParts = getKstDateParts();
  const item = pickTodaysSignalItem(candidates, dateParts);
  const roleMeta = getSignalRoleMeta(item);
  const title = getLocalizedTitle(item);
  const image = getSignalImage(item);
  const description = getSignalDescription(item);
  const isPdf = isPdfSignal(item);
  const card = document.createElement("article");
  const heading = document.createElement("h2");
  const meta = document.createElement("div");
  const handle = document.createElement("span");
  const titleNode = document.createElement("strong");
  const yearNode = document.createElement("span");
  const cta = document.createElement("a");
  const href = getSignalHref(item);
  let mobileMetaHost = null;

  card.className = image
    ? `todays-signal-card todays-signal-card-image${item.type === "novel" ? " todays-signal-card-novel" : ""}`
    : `todays-signal-card todays-signal-card-text${isPdf ? " todays-signal-card-document" : ""}`;
  card.setAttribute("aria-label", `${title} - ${roleMeta.category}`);

  heading.className = "todays-signal-heading";
  heading.textContent = `TODAY'S SIGNAL - ${roleMeta.category}`;

  handle.className = "todays-signal-handle";
  handle.textContent = roleMeta.handle;

  titleNode.className = "todays-signal-title";
  titleNode.textContent = title;

  yearNode.className = "todays-signal-year";
  yearNode.textContent = item.year || item.meta?.year || "";

  if (item.type === "novel") {
    const figure = document.createElement("figure");
    figure.className = "todays-signal-media todays-signal-novel-media";
    figure.append(createTodaysSignalNovelBook(item));
    makeTodaysSignalMediaClickable(figure, href, title);
    card.append(figure);
    mobileMetaHost = figure;
  } else if (image) {
    const figure = document.createElement("figure");
    const img = document.createElement("img");
    figure.className = "todays-signal-media";
    img.src = projectHref(image);
    img.alt = title;
    img.loading = "lazy";
    figure.append(img);
    makeTodaysSignalMediaClickable(figure, href, title);
    card.append(figure);
    mobileMetaHost = figure;
  } else {
    const copy = document.createElement("p");
    copy.className = isPdf
      ? "todays-signal-copy todays-signal-copy-document"
      : item.type === "paper"
        ? "todays-signal-copy todays-signal-copy-paper"
        : "todays-signal-copy";
    copy.textContent = description;
    card.append(copy);
  }

  cta.className = "todays-signal-cta";
  cta.href = href;
  cta.textContent = "VIEW →";
  meta.className = "todays-signal-meta";
  meta.append(handle, titleNode);
  if (yearNode.textContent) meta.append(yearNode);
  meta.append(cta);

  if (mobileMetaHost) {
    const mobileMeta = meta.cloneNode(true);
    meta.classList.add("todays-signal-meta-desktop");
    mobileMeta.classList.add("todays-signal-meta-mobile");
    mobileMetaHost.append(mobileMeta);
  }

  card.prepend(heading);
  card.append(meta);
  todaysSignalTarget.replaceChildren(card);
  updateHomeScrollMotion();
}

function makeTodaysSignalMediaClickable(media, href, title) {
  if (!media || !href) return;
  media.classList.add("todays-signal-media-link");
  media.setAttribute("role", "link");
  media.setAttribute("tabindex", "0");
  media.setAttribute("aria-label", `${title} view`);

  const openSignal = (event) => {
    if (event.target.closest("a, button")) return;
    window.location.href = href;
  };

  media.addEventListener("click", openSignal);
  media.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    window.location.href = href;
  });
}

function revealDeepLinkedContent() {
  if (!isRoleRoomPage || !window.location.hash.startsWith("#item-")) return;
  const targetId = window.location.hash.slice(1);
  if (activeRoleRoom === "novel") setNovelViewMode("grid");
  requestAnimationFrame(() => {
    window.setTimeout(() => {
      const target = document.getElementById(targetId);
      if (!target) return;
      target.scrollIntoView({ block: "center", inline: "nearest" });
      target.classList.add("is-signal-highlight");
      window.setTimeout(() => target.classList.remove("is-signal-highlight"), 1800);
    }, 80);
  });
}
