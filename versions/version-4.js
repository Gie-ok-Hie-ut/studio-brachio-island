const panels = document.querySelectorAll(".panel");
const slides = document.querySelector(".slides");

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle("is-active", entry.isIntersecting);
    });
  },
  {
    root: slides,
    threshold: 0.56,
  }
);

panels.forEach((panel) => observer.observe(panel));

const writingList = document.querySelector("#writing-list");
const readerTitle = document.querySelector("#reader-title");
const readerSource = document.querySelector("#reader-source");
const readerContent = document.querySelector("#reader-content");
const readerModal = document.querySelector("#reader-modal");
const readerWindow = document.querySelector(".reader-window");
const readerSize = document.querySelector("#reader-size");
const readerSpacing = document.querySelector("#reader-spacing");
const readerTheme = document.querySelector("#reader-theme");
const closeReaderControls = document.querySelectorAll("[data-close-reader]");
const writings = window.WRITING_DATA?.items || [];
const topLevelWritings = writings.filter((item) => item.topLevel !== false);
const defaultReaderSettings = {
  size: "medium",
  spacing: "normal",
  theme: "dark",
};

function getSavedReaderSettings() {
  try {
    return JSON.parse(localStorage.getItem("readerSettings") || "{}");
  } catch {
    return {};
  }
}

function saveReaderSettings() {
  try {
    localStorage.setItem("readerSettings", JSON.stringify(readerSettings));
  } catch {
    // Ignore storage errors in local file previews or private browsing.
  }
}

const readerSettings = {
  ...defaultReaderSettings,
  ...getSavedReaderSettings(),
};

function normalizeNotionId(value = "") {
  const compact = value.replace(/-/g, "");
  const match = compact.match(/[0-9a-f]{32}/i);
  if (!match) return "";
  return match[0].replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
}

function findWritingByHref(href) {
  const targetId = normalizeNotionId(href);
  if (!targetId) return null;
  return writings.find((item) => item.id === targetId) || null;
}

function renderInlinePart(part) {
  const internalWriting = part.href ? findWritingByHref(part.href) : null;
  const wrapper = part.href ? document.createElement(internalWriting ? "button" : "a") : document.createElement("span");
  if (part.href) {
    if (internalWriting) {
      wrapper.type = "button";
      wrapper.addEventListener("click", () => renderReader(internalWriting.id, true));
    } else {
      wrapper.href = part.href;
      wrapper.target = "_blank";
      wrapper.rel = "noreferrer";
    }
  }

  (part.text || "").split("\n").forEach((line, index) => {
    if (index > 0) wrapper.append(document.createElement("br"));
    wrapper.append(document.createTextNode(line));
  });

  (part.marks || []).forEach((mark) => {
    if (mark === "b") wrapper.classList.add("is-bold");
    if (mark === "i") wrapper.classList.add("is-italic");
    if (mark === "s") wrapper.classList.add("is-struck");
    if (mark === "c") wrapper.classList.add("is-code");
    if (mark.startsWith("h:")) wrapper.classList.add("is-highlighted");
  });

  return wrapper;
}

function renderMediaBlock(block) {
  const figure = document.createElement("figure");
  figure.className = `notion-media ${block.type}`;

  if (block.type === "video") {
    const iframe = document.createElement("iframe");
    iframe.src = block.src;
    iframe.title = block.caption || "Embedded video";
    iframe.loading = "lazy";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    figure.append(iframe);
  } else {
    const image = document.createElement("img");
    image.src = block.src;
    image.alt = block.caption || "Notion image";
    image.loading = "lazy";
    image.addEventListener("error", () => {
      figure.classList.add("is-unavailable");
    });
    figure.append(image);
  }

  const caption = document.createElement("figcaption");
  const source = document.createElement("a");
  caption.textContent = block.caption || block.type;
  if (block.originalSrc) {
    source.href = block.originalSrc;
    source.target = "_blank";
    source.rel = "noreferrer";
    source.textContent = " original";
    caption.append(source);
  }
  figure.append(caption);
  return figure;
}

function renderWritingList() {
  if (!writingList || writings.length === 0) return;

  writingList.replaceChildren(
    ...topLevelWritings.map((item, index) => {
      const row = document.createElement("p");
      const label = document.createElement("span");
      const button = document.createElement("button");

      label.textContent = `writing ${String(index + 1).padStart(2, "0")}`;
      button.type = "button";
      button.textContent = item.title;
      button.addEventListener("click", () => renderReader(item.id, true));

      row.append(label, button);
      return row;
    })
  );
}

function openReader() {
  if (!readerModal) return;
  readerModal.classList.add("is-open");
  readerModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("reader-open");
}

function applyReaderSettings() {
  if (!readerWindow) return;
  readerWindow.dataset.size = readerSettings.size;
  readerWindow.dataset.spacing = readerSettings.spacing;
  readerWindow.dataset.theme = readerSettings.theme;

  if (readerSize) readerSize.value = readerSettings.size;
  if (readerSpacing) readerSpacing.value = readerSettings.spacing;
  if (readerTheme) readerTheme.value = readerSettings.theme;

  saveReaderSettings();
}

function bindReaderSetting(control, key) {
  if (!control) return;
  control.addEventListener("change", () => {
    readerSettings[key] = control.value;
    applyReaderSettings();
  });
}

function closeReader() {
  if (!readerModal) return;
  readerModal.classList.remove("is-open");
  readerModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("reader-open");
}

function renderReader(id, shouldOpen = false) {
  const item = writings.find((writing) => writing.id === id) || writings[0];
  if (!item || !readerTitle || !readerSource || !readerContent) return;

  readerTitle.textContent = item.title;
  readerSource.href = item.url;
  readerSource.textContent = "open original";
  readerSource.target = "_blank";
  readerSource.rel = "noreferrer";

  const nodes = item.blocks.map((block) => {
    if (block.type === "image" || block.type === "video") {
      return renderMediaBlock(block);
    }

    if (block.type === "page_link") {
      const row = document.createElement("p");
      const button = document.createElement("button");
      row.className = `notion-block notion-page-link depth-${Math.min(block.depth || 0, 3)}`;
      button.type = "button";
      button.textContent = block.title;
      button.addEventListener("click", () => renderReader(block.targetId, true));
      row.append(button);
      return row;
    }

    const element = document.createElement(block.type === "header" ? "h3" : "p");
    element.className = `notion-block depth-${Math.min(block.depth || 0, 3)}`;
    (block.parts || [{ text: block.text || "" }]).forEach((part) => {
      element.append(renderInlinePart(part));
    });
    return element;
  });

  readerContent.replaceChildren(...nodes);
  readerContent.scrollTop = 0;
  if (shouldOpen) {
    openReader();
  }
}

closeReaderControls.forEach((control) => {
  control.addEventListener("click", closeReader);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeReader();
  }
});

bindReaderSetting(readerSize, "size");
bindReaderSetting(readerSpacing, "spacing");
bindReaderSetting(readerTheme, "theme");
applyReaderSettings();
renderWritingList();
if (writings[0]) {
  renderReader(writings[0].id);
}
