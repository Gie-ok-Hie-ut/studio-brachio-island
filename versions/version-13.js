const contentItems = window.CONTENT_INDEX?.items || [];
const pageType = document.body.dataset.page;
const roomId = document.body.dataset.room;
const isRoomPage = pageType === "room";
const rootPrefix = isRoomPage ? "../../" : "../";
let language = localStorage.getItem("v13Language") || "en";

const galleryAssets = [
  "IMG_9630.jpg",
  "2-8.jpg",
  "2-0.PNG",
  "2-1.PNG",
  "2-3.PNG",
  "2-2.PNG",
  "4-0.PNG",
  "2-6.jpg",
  "2-7.jpg",
  "2-5.jpg",
  "2-4.jpg",
  "6-0.JPG",
  "1-1.jpg",
  "1-0.PNG",
  "3-0.JPG",
  "7-0.PNG",
  "5-0.PNG",
  "IMG_5730.MOV",
];

const roomCopy = {
  identity: {
    href: "who-are-we.html",
    roleId: "identity",
  },
  engineer: {
    href: "ai-research.html",
    roleId: "engineer",
  },
  novel: {
    href: "novel.html",
    roleId: "novel",
  },
  visual: {
    href: "visual-art.html",
    roleId: "visual",
  },
  aesthetics: {
    href: "essay.html",
    roleId: "aesthetics",
  },
};

function byType(type) {
  return contentItems.filter((item) => item.type === type && item.topLevel !== false);
}

function roleItem(id) {
  return contentItems.find((item) => item.type === "role" && item.meta?.roleId === id);
}

function localizedTitle(item) {
  if (!item) return "";
  if (language === "ko") return item.titleKo || item.title || item.titleEn || "";
  return item.titleEn || item.titleKo || item.title || "";
}

function localizedMarkdown(item) {
  if (!item) return "";
  if (language === "ko") return item.markdownKo || item.markdown || item.markdownEn || "";
  return item.markdownEn || item.markdownKo || item.markdown || "";
}

function metaText(item, key, fallback = "") {
  const suffix = language === "ko" ? "Ko" : "En";
  return item?.meta?.[`${key}${suffix}`] || item?.meta?.[key] || fallback;
}

function setLanguage(nextLanguage) {
  language = nextLanguage === "ko" ? "ko" : "en";
  localStorage.setItem("v13Language", language);
  document.documentElement.lang = language;
  document.querySelectorAll("[data-language]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.language === language);
  });
  if (isRoomPage) renderRoom();
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function parseRecordSections(markdown = "") {
  const sections = [];
  let current = null;
  markdown.replace(/\r\n/g, "\n").split("\n").forEach((raw) => {
    const line = raw.trim();
    if (!line) return;
    if (line.startsWith("## ")) {
      current = { title: line.slice(3).trim(), rows: [] };
      sections.push(current);
      return;
    }
    if (!current) return;
    const clean = line.replace(/^[-*]\s+/, "");
    const parts = clean.split("|").map((part) => part.trim());
    if (parts.length < 2) return;
    current.rows.push({
      time: parts[0],
      title: parts[1],
      detail: parts.slice(2).join(" / "),
    });
  });
  return sections;
}

function renderPlainMarkdown(markdown = "") {
  return markdown
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      if (block.startsWith("## ")) return createElement("h2", "", block.slice(3));
      return createElement("p", "", block.replace(/\n/g, " "));
    });
}

function openModal(title, nodes, options = {}) {
  let modal = document.querySelector("#v13-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "v13-modal";
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-backdrop" data-close-modal></div>
      <section class="modal-window" role="dialog" aria-modal="true">
        <div class="modal-toolbar">
          <h2></h2>
          <button class="modal-close" type="button" data-close-modal aria-label="Close">×</button>
        </div>
        <div class="modal-content"></div>
      </section>
    `;
    document.body.append(modal);
    modal.querySelectorAll("[data-close-modal]").forEach((control) => {
      control.addEventListener("click", () => modal.classList.remove("is-open"));
    });
  }
  modal.querySelector("h2").textContent = title;
  const content = modal.querySelector(".modal-content");
  content.classList.toggle("modal-pdf", options.type === "pdf");
  content.replaceChildren(...nodes);
  modal.classList.add("is-open");
}

function openContentItem(item) {
  if (!item) return;
  if (item.meta?.format === "pdf" && item.meta?.pdf) {
    const frame = document.createElement("iframe");
    frame.className = "pdf-frame";
    frame.src = rootPrefix + item.meta.pdf.replace(/^\.\.\//, "");
    frame.title = localizedTitle(item);
    openModal(localizedTitle(item), [frame], { type: "pdf" });
    return;
  }
  openModal(localizedTitle(item), renderPlainMarkdown(localizedMarkdown(item)));
}

function openPdfPath(title, path) {
  const frame = document.createElement("iframe");
  frame.className = "pdf-frame";
  frame.src = rootPrefix + path.replace(/^\.\.\//, "");
  frame.title = title;
  openModal(title, [frame], { type: "pdf" });
}

function renderProfileLinks(item, target) {
  if (!item || item.meta?.roleId !== "engineer") return;
  const links = createElement("div", "profile-links");
  if (item.meta.linkedin) {
    const linkedin = createElement("a", "", "LinkedIn");
    linkedin.href = item.meta.linkedin;
    linkedin.target = "_blank";
    linkedin.rel = "noreferrer";
    links.append(linkedin);
  }
  if (item.meta.scholar) {
    const scholar = createElement("a", "", "Google Scholar");
    scholar.href = item.meta.scholar;
    scholar.target = "_blank";
    scholar.rel = "noreferrer";
    links.append(scholar);
  }
  if (item.meta.cvPdf) {
    const cv = createElement("button", "", "CV");
    cv.type = "button";
    cv.addEventListener("click", () => openPdfPath("CV", item.meta.cvPdf));
    links.append(cv);
  }
  target.append(links);
}

function createRoomShell(item) {
  const page = createElement("section", "room-page");
  const nav = createElement("nav", "room-nav");
  const back = createElement("a", "", "← Studio Hall");
  const next = createElement("a", "", "Resident Room");
  const title = createElement("aside", "room-title");
  const heading = createElement("h1", "", metaText(item, "detailTitle", localizedTitle(item)));
  const handle = createElement("span", "handle", metaText(item, "handle", item.meta?.handle || ""));
  const body = createElement("section", "room-content");

  back.href = "../version-13.html";
  next.href = "../version-13.html";
  nav.append(back, next);
  title.append(heading, handle);
  renderProfileLinks(item, title);
  page.append(nav, title, body);
  return { page, body };
}

function renderRecordSection(section, extras = {}) {
  const wrapper = createElement("section", "record-section");
  wrapper.append(createElement("h2", "", section.title));
  const list = createElement("div", "record-list");
  section.rows.forEach((row) => {
    const item = extras.findItem?.(row);
    const record = createElement("article", "record-row");
    const time = createElement("span", "record-time", row.time);
    const main = createElement("div", "record-main");
    main.append(createElement("strong", "", row.title));
    if (row.detail) main.append(createElement("span", "", row.detail));
    record.append(time, main);
    if (item) {
      const button = createElement("button", "open-button", "Open");
      button.type = "button";
      button.addEventListener("click", () => openContentItem(item));
      record.append(button);
    }
    list.append(record);
  });
  wrapper.append(list);
  return wrapper;
}

function renderIdentity(item, body) {
  const layout = createElement("div", "identity-layout");
  const statement = createElement("p", "identity-statement", localizedMarkdown(item));
  const figure = document.createElement("figure");
  const img = document.createElement("img");
  const caption = createElement("figcaption", "", item.meta?.caption || "Portrait");
  figure.className = "identity-figure";
  img.src = rootPrefix + (item.meta?.image || "../assets/identity-portrait.png").replace(/^\.\.\//, "");
  img.alt = item.meta?.caption || "Portrait";
  figure.append(img, caption);
  layout.append(statement, figure);
  body.replaceChildren(layout);
}

function renderEngineer(item, body) {
  const sections = parseRecordSections(localizedMarkdown(item));
  sections.forEach((section) => {
    body.append(renderRecordSection(section));
  });

  const projectSection = {
    title: "Projects",
    rows: byType("engineering").map((project) => ({
      time: project.meta?.label || "Project",
      title: localizedTitle(project),
      detail: localizedMarkdown(project),
    })),
  };
  body.append(renderRecordSection(projectSection));

  const paperSection = {
    title: "Paper",
    rows: byType("paper").map((paper) => ({
      time: paper.meta?.year || "Paper",
      title: localizedTitle(paper),
      detail: localizedMarkdown(paper),
      id: paper.id,
    })),
  };
  body.append(renderRecordSection(paperSection, {
    findItem: (row) => contentItems.find((candidate) => candidate.id === row.id),
  }));
}

function makeNovelCard(item, index) {
  const card = createElement("button", `novel-card ${index % 5 === 1 ? "is-blue" : ""}`);
  const number = createElement("span", "", String(index + 1).padStart(2, "0"));
  const title = createElement("strong", "", localizedTitle(item));
  const tags = createElement("em", "", (item.meta?.tags || []).slice(0, 3).join(" "));
  const type = createElement("em", "", "Markdown Novel");
  card.type = "button";
  card.append(number, title, tags, type);
  card.addEventListener("click", () => openContentItem(item));
  return card;
}

function positionNovelCards(deck, angle = 0) {
  const cards = [...deck.querySelectorAll(".novel-card")];
  const radius = Math.min(deck.clientWidth * 0.7, 760);
  const vertical = Math.min(radius * 0.86, deck.clientHeight * 0.92);
  const center = Math.floor(cards.length / 2);
  cards.forEach((card, index) => {
    const raw = (index - center) * 24 + angle;
    const normalized = ((((raw + 180) % 360) + 360) % 360) - 180;
    const distance = Math.abs(normalized);
    const radians = normalized * Math.PI / 180;
    const visible = distance <= 100;
    card.style.setProperty("--x", `${(Math.sin(radians) * radius).toFixed(2)}px`);
    card.style.setProperty("--y", `${(-Math.cos(radians) * vertical).toFixed(2)}px`);
    card.style.setProperty("--r", `${normalized.toFixed(2)}deg`);
    card.style.setProperty("--s", `${(visible ? Math.max(0.74, 1 - distance / 330) : 0.64).toFixed(3)}`);
    card.style.setProperty("--o", visible ? "1" : "0");
    card.style.zIndex = String(visible ? Math.round(100 - distance) : 0);
    card.tabIndex = visible ? 0 : -1;
  });
}

function renderNovel(item, body) {
  body.append(...renderPlainMarkdown(localizedMarkdown(item)));
  const room = createElement("div", "novel-room");
  const controls = createElement("div", "novel-controls");
  const left = createElement("button", "", "←");
  const right = createElement("button", "", "→");
  const deck = createElement("div", "novel-deck");
  let angle = 0;
  const novels = byType("novel");
  const repeated = Array.from({ length: Math.ceil(18 / Math.max(novels.length, 1)) }, () => novels).flat();
  repeated.forEach((novel, index) => deck.append(makeNovelCard(novel, index % novels.length)));
  const move = (direction) => {
    angle += direction * 24;
    positionNovelCards(deck, angle);
  };
  left.type = "button";
  right.type = "button";
  left.addEventListener("click", () => move(-1));
  right.addEventListener("click", () => move(1));
  controls.append(left, right);
  room.append(controls, deck);
  body.append(room);
  requestAnimationFrame(() => positionNovelCards(deck, angle));
  window.addEventListener("resize", () => positionNovelCards(deck, angle));
}

function renderVisual(item, body) {
  body.append(...renderPlainMarkdown(localizedMarkdown(item)));
  const gallery = createElement("div", "gallery-assets");
  byType("gallery").forEach((galleryItem) => {
    const card = createElement("button", "asset-card");
    const img = document.createElement("img");
    img.src = rootPrefix + (galleryItem.meta?.image || "../assets/hero-workspace.png").replace(/^\.\.\//, "");
    img.alt = localizedTitle(galleryItem);
    card.type = "button";
    card.append(img, createElement("span", "", localizedTitle(galleryItem) || "Markdown Gallery Item"));
    card.addEventListener("click", () => openContentItem(galleryItem));
    gallery.append(card);
  });
  galleryAssets.forEach((filename) => {
    const card = createElement("article", "asset-card");
    const src = `${rootPrefix}content/gallery/assets/${filename}`;
    const isVideo = /\.(mov|mp4|webm)$/i.test(filename);
    const media = document.createElement(isVideo ? "video" : "img");
    media.src = src;
    if (isVideo) {
      media.controls = true;
      media.muted = true;
      media.playsInline = true;
    } else {
      media.alt = filename;
      media.loading = "lazy";
    }
    card.append(media, createElement("span", "", filename));
    gallery.append(card);
  });
  body.append(gallery);
}

function renderEssay(item, body) {
  body.append(...renderPlainMarkdown(localizedMarkdown(item)));
  const section = {
    title: "Essay",
    rows: byType("essay").filter((essay) => essay.id === "complete-artist-linear-art").map((essay, index) => ({
      time: `Essay ${String(index + 1).padStart(2, "0")}`,
      title: localizedTitle(essay),
      detail: localizedMarkdown(essay),
      id: essay.id,
    })),
  };
  body.append(renderRecordSection(section, {
    findItem: (row) => contentItems.find((candidate) => candidate.id === row.id),
  }));
}

function renderRoom() {
  const item = roleItem(roomCopy[roomId]?.roleId || roomId);
  const root = document.querySelector("#room-root");
  if (!item || !root) return;
  const { page, body } = createRoomShell(item);
  root.replaceChildren(page);
  if (roomId === "identity") renderIdentity(item, body);
  else if (roomId === "engineer") renderEngineer(item, body);
  else if (roomId === "novel") renderNovel(item, body);
  else if (roomId === "visual") renderVisual(item, body);
  else if (roomId === "aesthetics") renderEssay(item, body);
}

document.querySelectorAll("[data-language]").forEach((button) => {
  button.addEventListener("click", () => setLanguage(button.dataset.language));
});

setLanguage(language);
