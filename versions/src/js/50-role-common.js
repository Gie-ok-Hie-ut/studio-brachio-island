const ROLE_OVERVIEW_CLASS = "role-overview";

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
