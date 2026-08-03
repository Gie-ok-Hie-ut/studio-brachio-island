const ROLE_OVERVIEW_CLASS = "role-overview";
const ROLE_OVERVIEW_STACK_CLASS = "role-overview-stack";

function appendMarkdownText(parent, text, context = {}) {
  text.split("\n").forEach((line, index) => appendMarkdownLine(parent, line, index, context));
}

function renderRoleMarkdownNote(markdown = "", body, context = {}, extraClasses = []) {
  const intro = createRoleIntroNode(markdown, context, extraClasses);
  if (!intro) return;
  body.append(intro);
}

function createRoleIntroNode(markdown = "", context = {}, extraClasses = []) {
  const introParagraphs = getRecordIntro(markdown);
  if (introParagraphs.length === 0) return null;

  const intro = document.createElement(introParagraphs.length > 1 ? "div" : "p");
  intro.className = [
    "role-intro",
    introParagraphs.length > 1 ? "role-intro-stack" : "",
    ...extraClasses,
  ]
    .filter(Boolean)
    .join(" ");
  if (introParagraphs.length > 1) {
    introParagraphs.forEach((paragraph) => {
      const text = document.createElement("p");
      appendMarkdownText(text, paragraph, context);
      intro.append(text);
    });
  } else {
    appendMarkdownText(intro, introParagraphs[0], context);
  }
  return intro;
}

function createRoleOverviewNode(markdown = "", context = {}) {
  const intro = createRoleIntroNode(markdown, context, [ROLE_OVERVIEW_CLASS]);
  if (!intro) return null;

  const stack = document.createElement("div");
  stack.className = ROLE_OVERVIEW_STACK_CLASS;
  stack.append(intro);
  return stack;
}

function appendRoleOverview(markdown = "", target, context = {}) {
  const overview = createRoleOverviewNode(markdown, context);
  if (!overview) return null;
  target.append(overview);
  return overview;
}

function getRoleItem(panelId) {
  return roleItems.find((item) => item.meta?.roleId === panelId) || null;
}

function getMetaText(item, key, fallback = "") {
  const lang = readerSettings.lang === "ko" ? "Ko" : "En";
  return item?.meta?.[`${key}${lang}`] || item?.meta?.[key] || fallback;
}

function createRoleHeading(title, handle = "", tagName = "strong") {
  const heading = document.createElement(tagName);
  heading.className = "role-heading";
  String(title)
    .split("//")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const lineNode = document.createElement("span");
      lineNode.className = "role-heading-line";
      lineNode.textContent = line;
      heading.append(lineNode);
    });
  if (handle) {
    const handleNode = document.createElement("b");
    const handleText = String(handle).trim();
    handleNode.className = "role-heading-handle";
    const handleLines = handleText
      .split("//")
      .map((line) => line.trim())
      .filter(Boolean);

    if (handleLines.length > 1) {
      handleNode.classList.add("role-heading-handle-multiline");
      handleLines.forEach((line) => {
        const rowNode = document.createElement("span");
        const markNode = document.createElement("span");
        const textNode = document.createElement("span");
        const hasVisibleMark = line.startsWith("@");
        rowNode.className = "role-heading-handle-row";
        markNode.className = "role-heading-mark";
        textNode.className = "role-heading-handle-text";
        markNode.textContent = "@";
        if (!hasVisibleMark) {
          markNode.classList.add("role-heading-mark-spacer");
          markNode.setAttribute("aria-hidden", "true");
        }
        textNode.textContent = line.replace(/^@/, "").trim();
        rowNode.append(markNode, textNode);
        handleNode.append(rowNode);
      });
    } else {
      const markNode = document.createElement("span");
      const textNode = document.createElement("span");
      markNode.className = "role-heading-mark";
      textNode.className = "role-heading-handle-text";
      markNode.textContent = handleText.startsWith("@") ? "@" : "";
      textNode.textContent = handleText.replace(/^@/, "").trim();
      handleNode.append(markNode, textNode);
    }
    heading.append(handleNode);
  }
  return heading;
}

function createProfileIcon(type) {
  const icon = document.createElement("span");
  icon.className = `role-profile-icon role-profile-icon-${type}`;
  icon.setAttribute("aria-hidden", "true");

  const icons = {
    linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5.1 8.9h3.1v10H5.1v-10Zm1.6-4.8a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6Zm4.2 4.8h3v1.4h.1c.4-.8 1.5-1.7 3-1.7 3.2 0 3.8 2.1 3.8 4.8v5.5h-3.1V14c0-1.2 0-2.7-1.6-2.7s-1.9 1.3-1.9 2.6v5h-3.1v-10Z"/></svg>',
    scholar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="m3 9 9-5 9 5-9 5-9-5Z"/><path d="M7 11.2v4.3c1.3 1.2 3 1.8 5 1.8s3.7-.6 5-1.8v-4.3"/><path d="M21 9v6"/></svg>',
    cv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M7 3h7l3 3v15H7V3Z"/><path d="M14 3v4h4"/><path d="M9.5 12h5"/><path d="M9.5 16h5"/></svg>',
  };

  icon.innerHTML = icons[type] || icons.cv;
  return icon;
}

function createRoleItemButton(label, onClick, options = {}) {
  const button = document.createElement("button");
  button.type = "button";
  if (options.anchorId) button.id = options.anchorId;
  if (options.contentId) button.dataset.contentId = options.contentId;
  if (options.image) {
    const image = document.createElement("img");
    image.src = projectHref(options.image);
    image.alt = label;
    image.loading = "lazy";
    button.append(image);
  }
  const kicker = document.createElement("span");
  const title = document.createElement("strong");
  kicker.textContent = options.kicker || "open";
  if (options.description) {
    const titleText = document.createElement("span");
    const description = document.createElement("small");
    titleText.className = "cv-entry-title";
    description.className = "cv-entry-detail";
    titleText.textContent = label;
    String(options.description)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        const detailLine = document.createElement("span");
        detailLine.textContent = line;
        description.append(detailLine);
      });
    title.append(titleText, description);
  } else {
    title.textContent = label;
  }
  button.append(kicker, title);
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    onClick();
  });
  return button;
}

function parseRecordSections(markdown = "") {
  const sections = [];
  let current = null;

  normalizeMarkdownSource(markdown).split("\n").forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) return;
    if (line.startsWith("## ")) {
      current = { title: line.slice(3).trim(), rows: [] };
      sections.push(current);
      return;
    }
    if (!current) return;
    const clean = line.replace(/^[-*]\s+/, "");
    const [label, ...rest] = clean.split("|");
    if (!label || rest.length === 0) return;
    current.rows.push({
      label: label.trim(),
      text: rest[0].trim(),
      detail: rest.slice(1).join("|").trim(),
    });
  });

  return sections;
}

function getRecordIntro(markdown = "") {
  const normalized = normalizeMarkdownSource(markdown);
  const firstHeadingIndex = normalized.search(/^##\s+/m);
  const intro = firstHeadingIndex === -1 ? normalized : normalized.slice(0, firstHeadingIndex);
  return intro
    .split(/\n\s*\n/)
    .map((paragraph) =>
      paragraph
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join(" ")
    )
    .filter(Boolean);
}
