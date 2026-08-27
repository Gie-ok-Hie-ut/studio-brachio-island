/* Markdown parsing and reader content rendering. */

function normalizeMarkdownTextLine(line) {
  const italicSentence = line.match(/^\*\s+(.+)\*$/);
  return italicSentence ? `*${italicSentence[1]}*` : line;
}

function appendMarkdownLink(parent, label, href, context = {}) {
  if (href.startsWith("notion:")) {
    const contentItem = findContentByHref(href);
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", () => {
      if (contentItem) openMarkdownReaderFromCurrent(contentItem.id);
    });
    button.disabled = !contentItem;
    parent.append(button);
    return;
  }

  const markdownItem = findContentByMarkdownHref(href, context);
  if (markdownItem) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", () => openMarkdownReaderFromCurrent(markdownItem.id));
    parent.append(button);
    return;
  }

  if (isMarkdownHref(href)) {
    const markdownPath = resolveContentRelativePath(href, context);
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", () => openMarkdownFileReaderFromCurrent(markdownPath, label, context.item));
    button.disabled = !markdownPath;
    parent.append(button);
    return;
  }

  const link = document.createElement("a");
  link.href = resolveMarkdownAssetHref(href, context);
  link.target = "_blank";
  link.rel = "noreferrer";
  appendMarkdownInline(link, label, context);
  parent.append(link);
}

function appendMarkdownImage(parent, alt, src, context = {}) {
  const image = document.createElement("img");
  image.src = resolveMarkdownAssetHref(src, context);
  image.alt = alt;
  image.loading = "lazy";
  parent.append(image);
}

function appendMarkdownInline(parent, text, context = {}) {
  const pattern = /(!?\[[^\]]*\]\([^)]+\)|`[^`\n]+`|\*\*[^*\n]+?\*\*|__[^_\n]+?__|~~[^~\n]+?~~|\*[^*\n]+?\*|_[^_\n]+?_|<u>[^<\n]+?<\/u>|<br\s*\/?>)/gi;
  let cursor = 0;
  let match = pattern.exec(text);

  while (match) {
    const token = match[0];
    if (match.index > cursor) {
      parent.append(document.createTextNode(text.slice(cursor, match.index)));
    }

    const imageMatch = token.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);

    if (/^<br\s*\/?>$/i.test(token)) {
      parent.append(document.createElement("br"));
    } else if (imageMatch) {
      appendMarkdownImage(parent, imageMatch[1], imageMatch[2], context);
    } else if (linkMatch) {
      appendMarkdownLink(parent, linkMatch[1], linkMatch[2], context);
    } else if (token.startsWith("`") && token.endsWith("`")) {
      const code = document.createElement("code");
      code.className = "is-code";
      code.textContent = token.slice(1, -1);
      parent.append(code);
    } else if (token.startsWith("**") && token.endsWith("**")) {
      const strong = document.createElement("strong");
      strong.className = "is-bold";
      appendMarkdownInline(strong, token.slice(2, -2), context);
      parent.append(strong);
    } else if (token.startsWith("__") && token.endsWith("__")) {
      const strong = document.createElement("strong");
      strong.className = "is-bold";
      appendMarkdownInline(strong, token.slice(2, -2), context);
      parent.append(strong);
    } else if (token.startsWith("~~") && token.endsWith("~~")) {
      const strike = document.createElement("s");
      strike.className = "is-struck";
      appendMarkdownInline(strike, token.slice(2, -2), context);
      parent.append(strike);
    } else if (token.startsWith("*") && token.endsWith("*")) {
      const emphasis = document.createElement("em");
      emphasis.className = "is-italic";
      appendMarkdownInline(emphasis, token.slice(1, -1), context);
      parent.append(emphasis);
    } else if (token.startsWith("_") && token.endsWith("_")) {
      const emphasis = document.createElement("em");
      emphasis.className = "is-italic";
      appendMarkdownInline(emphasis, token.slice(1, -1), context);
      parent.append(emphasis);
    } else if (/^<u>[\s\S]+<\/u>$/i.test(token)) {
      const underline = document.createElement("span");
      underline.className = "is-underlined";
      appendMarkdownInline(underline, token.replace(/^<u>|<\/u>$/gi, ""), context);
      parent.append(underline);
    } else {
      parent.append(document.createTextNode(token));
    }

    cursor = pattern.lastIndex;
    match = pattern.exec(text);
  }

  if (cursor < text.length) {
    parent.append(document.createTextNode(text.slice(cursor)));
  }
}

function appendMarkdownLine(parent, line, index = 0, context = {}) {
  if (index > 0) parent.append(document.createElement("br"));
  appendMarkdownInline(parent, normalizeMarkdownTextLine(line), context);
}

function createMarkdownParagraph(lines, context = {}) {
  const paragraph = document.createElement("p");
  paragraph.className = "markdown-block";
  lines.forEach((line, index) => appendMarkdownLine(paragraph, line, index, context));
  return paragraph;
}

function createMarkdownHeading(level, text, context = {}) {
  const tagName = level <= 1 ? "h2" : level === 2 ? "h3" : "h4";
  const heading = document.createElement(tagName);
  heading.className = `markdown-heading markdown-heading-${level}`;
  appendMarkdownInline(heading, text, context);
  return heading;
}

function createMarkdownMediaBlock(line, context = {}) {
  const figure = document.createElement("figure");
  figure.className = "notion-media markdown-media";
  appendMarkdownInline(figure, line, context);
  return figure;
}

function getYouTubeEmbedUrl(rawUrl = "") {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return "";
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  let videoId = "";

  if (host === "youtu.be") {
    videoId = url.pathname.split("/").filter(Boolean)[0] || "";
  } else if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    const pathParts = url.pathname.split("/").filter(Boolean);
    if (url.pathname === "/watch") videoId = url.searchParams.get("v") || "";
    else if (pathParts[0] === "shorts" || pathParts[0] === "embed") videoId = pathParts[1] || "";
  }

  if (!/^[\w-]{6,}$/.test(videoId)) return "";

  const embedUrl = new URL(`https://www.youtube.com/embed/${videoId}`);
  const start = url.searchParams.get("start") || url.searchParams.get("t");
  const startSeconds = parseYouTubeStartTime(start);
  if (startSeconds > 0) embedUrl.searchParams.set("start", String(startSeconds));
  return embedUrl.toString();
}

function parseYouTubeStartTime(value = "") {
  if (!value) return 0;
  if (/^\d+$/.test(value)) return Number(value);
  const match = String(value).match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
  if (!match) return 0;
  return (Number(match[1] || 0) * 3600) + (Number(match[2] || 0) * 60) + Number(match[3] || 0);
}

function createMarkdownYouTubeBlock(url) {
  const embedUrl = getYouTubeEmbedUrl(url);
  if (!embedUrl) return null;

  const figure = document.createElement("figure");
  figure.className = "notion-media markdown-media markdown-video";

  const iframe = document.createElement("iframe");
  iframe.src = embedUrl;
  iframe.title = "Embedded YouTube video";
  iframe.loading = "lazy";
  iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  iframe.allowFullscreen = true;
  figure.append(iframe);
  return figure;
}

function createMarkdownList(items, ordered, context = {}) {
  const list = document.createElement(ordered ? "ol" : "ul");
  list.className = "markdown-list";
  items.forEach((item) => {
    const listItem = document.createElement("li");
    appendMarkdownInline(listItem, normalizeMarkdownTextLine(item), context);
    list.append(listItem);
  });
  return list;
}

function createMarkdownQuote(lines, context = {}) {
  const quote = document.createElement("blockquote");
  quote.className = "markdown-quote";
  lines.forEach((line, index) => appendMarkdownLine(quote, line, index, context));
  return quote;
}

function createMarkdownCodeBlock(lines) {
  const pre = document.createElement("pre");
  const code = document.createElement("code");
  pre.className = "markdown-code-block";
  code.textContent = lines.join("\n");
  pre.append(code);
  return pre;
}

function createMarkdownDivider() {
  const divider = document.createElement("hr");
  divider.className = "markdown-divider";
  return divider;
}

function getMarkdownListMatch(line) {
  if (/^\*\s+.+\*$/.test(line)) return null;
  const orderedMatch = line.match(/^(\d+)[.)]\s+(.+)$/);
  if (orderedMatch) return { ordered: true, text: orderedMatch[2] };

  const unorderedMatch = line.match(/^([-+*])\s+(.+)$/);
  if (unorderedMatch) return { ordered: false, text: unorderedMatch[2] };
  return null;
}

function normalizeMarkdownSource(markdown = "", lang = getSiteLanguage()) {
  let source = markdown.replace(/\r\n/g, "\n");

  if (source.startsWith("---\n")) {
    const frontmatterEnd = source.indexOf("\n---", 4);
    if (frontmatterEnd !== -1) source = source.slice(frontmatterEnd + 4).trimStart();
  }

  const markerPattern = /<!--\s*(ko|en)\s*-->/gi;
  const matches = [...source.matchAll(markerPattern)];
  if (!matches.length) return source;

  const sections = {};
  matches.forEach((match, index) => {
    const lang = match[1].toLowerCase();
    const start = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? source.length;
    sections[lang] = source.slice(start, end).trim();
  });

  const targetLang = lang === "ko" ? "ko" : "en";
  return sections[targetLang] || sections.ko || sections.en || "";
}

function renderMarkdown(markdown = "", title = "", context = {}) {
  const lines = normalizeMarkdownSource(markdown, context.lang || getSiteLanguage()).split("\n");
  const blocks = [];
  let paragraphLines = [];
  let quoteLines = [];
  let listItems = [];
  let listOrdered = false;
  let codeLines = null;

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    blocks.push(createMarkdownParagraph(paragraphLines, context));
    paragraphLines = [];
  };

  const flushQuote = () => {
    if (!quoteLines.length) return;
    blocks.push(createMarkdownQuote(quoteLines, context));
    quoteLines = [];
  };

  const flushList = () => {
    if (!listItems.length) return;
    blocks.push(createMarkdownList(listItems, listOrdered, context));
    listItems = [];
  };

  const flushTextBlocks = () => {
    flushParagraph();
    flushQuote();
    flushList();
  };

  lines.forEach((rawLine, index) => {
    const trimmed = rawLine.trim();
    const isFirstTitle = index === 0 && title && trimmed === `# ${title}`;

    if (isFirstTitle) return;

    if (codeLines) {
      if (trimmed.startsWith("```")) {
        blocks.push(createMarkdownCodeBlock(codeLines));
        codeLines = null;
      } else {
        codeLines.push(rawLine);
      }
      return;
    }

    if (trimmed.startsWith("```")) {
      flushTextBlocks();
      codeLines = [];
      return;
    }

    if (!trimmed) {
      flushTextBlocks();
      return;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushTextBlocks();
      blocks.push(createMarkdownHeading(headingMatch[1].length, headingMatch[2], context));
      return;
    }

    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushTextBlocks();
      blocks.push(createMarkdownDivider());
      return;
    }

    const quoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      quoteLines.push(quoteMatch[1]);
      return;
    }

    const listMatch = getMarkdownListMatch(trimmed);
    if (listMatch) {
      flushParagraph();
      flushQuote();
      if (listItems.length && listOrdered !== listMatch.ordered) flushList();
      listOrdered = listMatch.ordered;
      listItems.push(listMatch.text);
      return;
    }

    if (/^!\[[^\]]*\]\([^)]+\)$/.test(trimmed)) {
      flushTextBlocks();
      blocks.push(createMarkdownMediaBlock(trimmed, context));
      return;
    }

    const youtubeBlock = createMarkdownYouTubeBlock(trimmed);
    if (youtubeBlock) {
      flushTextBlocks();
      blocks.push(youtubeBlock);
      return;
    }

    flushQuote();
    flushList();
    paragraphLines.push(trimmed);
  });

  flushTextBlocks();
  if (codeLines) blocks.push(createMarkdownCodeBlock(codeLines));
  return blocks;
}

function createNovelReaderMedia(item, title) {
  const assets = getNovelProjectAssets(item);
  if (assets.length === 0) return null;

  const gallery = document.createElement("section");
  gallery.className = "novel-project-media";
  gallery.setAttribute("aria-label", `${title} media`);

  assets.forEach((asset) => {
    const link = document.createElement("a");
    link.href = projectHref(asset);
    link.target = "_blank";
    link.rel = "noreferrer";
    link.className = "novel-project-media-item";
    link.append(createGalleryMedia(asset, title));
    gallery.append(link);
  });

  return gallery;
}

function createNovelAccessNotice(item, title, lang = getSiteLanguage()) {
  const copy = getNovelWithheldCopy(lang);
  const section = document.createElement("section");
  const meta = document.createElement("p");
  const notice = document.createElement("p");
  const contact = document.createElement("a");
  const year = String(item.meta?.year || "").trim();
  const tags = (Array.isArray(item.meta?.tags) ? item.meta.tags : [])
    .filter((tag) => String(tag).trim() !== `#${year}`);
  const metaParts = [year, ...tags].filter(Boolean);

  section.className = "novel-access-notice";

  if (metaParts.length > 0) {
    meta.className = "novel-access-meta";
    meta.textContent = metaParts.join(" ");
    section.append(meta);
  }

  notice.className = "novel-access-copy";
  notice.textContent = copy.notice || "";
  section.append(notice);

  contact.className = "novel-access-contact";
  contact.href = `mailto:${copy.email}?subject=${encodeURIComponent(title)}`;
  contact.textContent = copy.cta || "";
  section.append(contact);

  return section;
}

function composeReaderContent(item, title, lang, markdownNodes = []) {
  if (item?.type !== "novel") return markdownNodes;

  const bodyAccess = getNovelBodyAccess(item);
  const media = createNovelReaderMedia(item, title);
  const content = [media];

  if (bodyAccess !== "withheld") content.push(...markdownNodes);
  if (bodyAccess !== "public") content.push(createNovelAccessNotice(item, title, lang));

  return content.filter(Boolean);
}

function renderMarkdownFileReader(path, title, parentItem = null, shouldOpen = false, options = {}) {
  if (!path || !readerTitle || !readerSource || !readerContent) return;
  setReaderVariant("");
  const chapterItem = findContentByPath(path);
  const readerItem = chapterItem || parentItem;
  if (shouldOpen || options.preserveLanguage) {
    prepareReaderLanguage(readerItem, { preserveLanguage: options.preserveLanguage });
  }
  currentReader = {
    type: "chapter",
    id: path,
    path,
    title,
    parentId: parentItem?.id || "",
  };

  const localizedTitle = chapterItem ? getLocalizedTitle(chapterItem, getReaderLanguage()) : title;
  readerTitle.textContent = localizedTitle;
  readerSource.href = projectHref(path);
  readerSource.textContent = "";
  readerSource.target = "_blank";
  readerSource.rel = "noreferrer";

  if (shouldOpen) openReader({ skipUrl: options.skipUrl });

  const markdownRequest = chapterItem
    ? Promise.resolve(getLocalizedMarkdown(chapterItem, getReaderLanguage()))
    : fetch(projectHref(path)).then((response) => {
        if (!response.ok) throw new Error("chapter not found");
        return response.text();
      });

  markdownRequest
    .then((markdown) => {
      if (currentReader.type !== "chapter" || currentReader.path !== path) return;
      const markdownNodes = renderMarkdown(markdown, localizedTitle, {
        item: readerItem,
        basePath: path,
        lang: getReaderLanguage(),
      });
      readerContent.replaceChildren(...composeReaderContent(
        readerItem,
        localizedTitle,
        getReaderLanguage(),
        markdownNodes
      ));
      if (options.scrollState) restoreReaderScrollState(options.scrollState);
      else readerContent.scrollTop = 0;
      updateReaderBackState();
      scheduleReaderScrollIndicatorUpdate();
    })
    .catch(() => {
      if (currentReader.type !== "chapter" || currentReader.path !== path) return;
      const error = document.createElement("p");
      error.className = "markdown-block";
      error.textContent = getReaderLanguage() === "ko"
        ? "파일을 불러올 수 없습니다."
        : "Unable to load this file.";
      readerContent.replaceChildren(error);
      scheduleReaderScrollIndicatorUpdate();
    });
}

function renderMarkdownReader(id, shouldOpen = false, options = {}) {
  const item = findContentById(id) || contentItems[0];
  if (!item || !readerTitle || !readerSource || !readerContent) return;
  setReaderVariant("");
  if (shouldOpen || options.preserveLanguage) {
    prepareReaderLanguage(item, { preserveLanguage: options.preserveLanguage });
  }
  currentReader = { type: "content", id: item.id };

  const readerLanguage = getReaderLanguage();
  const title = getLocalizedTitle(item, readerLanguage);
  readerTitle.textContent = title;
  readerSource.href = projectHref(item.path);
  readerSource.textContent = "";
  readerSource.target = "_blank";
  readerSource.rel = "noreferrer";

  const markdownNodes = renderMarkdown(getLocalizedMarkdown(item, readerLanguage), title, {
    item,
    basePath: item.path,
    lang: readerLanguage,
  });
  readerContent.replaceChildren(...composeReaderContent(item, title, readerLanguage, markdownNodes));
  if (options.scrollState) restoreReaderScrollState(options.scrollState);
  else readerContent.scrollTop = 0;
  updateReaderBackState();
  scheduleReaderScrollIndicatorUpdate();
  if (shouldOpen) {
    openReader({ skipUrl: options.skipUrl });
  }
}

function renderPdfReader(id, options = {}) {
  const item = findContentById(id);
  if (!item || !pdfTitle || !pdfSource || !pdfFrame || !item.meta?.pdf) return;

  currentReader = { type: "pdf", id: item.id };
  const title = getLocalizedTitle(item);
  pdfTitle.textContent = title;
  setPdfViewerSource(title, item.meta.pdf);
  openPdf({ skipUrl: options.skipUrl });
}

function openPdfFile(title, pdfPath, options = {}) {
  if (!pdfTitle || !pdfSource || !pdfFrame) return;
  currentReader = { type: "pdf", id: pdfPath };
  pdfTitle.textContent = title;
  setPdfViewerSource(title, pdfPath);
  openPdf({ skipUrl: options.skipUrl });
}
