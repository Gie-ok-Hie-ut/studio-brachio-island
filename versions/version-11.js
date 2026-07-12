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

if (slides) {
  panels.forEach((panel) => observer.observe(panel));
}

const writingList = document.querySelector("#writing-list");
const galleryList = document.querySelector("#gallery-list");
const essayList = document.querySelector("#essay-list");
const paperList = document.querySelector("#paper-list");
const readerTitle = document.querySelector("#reader-title");
const readerSource = document.querySelector("#reader-source");
const readerContent = document.querySelector("#reader-content");
const readerModal = document.querySelector("#reader-modal");
const readerWindow = document.querySelector(".reader-window");
const pdfModal = document.querySelector("#pdf-modal");
const pdfTitle = document.querySelector("#pdf-title");
const pdfSource = document.querySelector("#pdf-source");
const pdfFrame = document.querySelector("#pdf-frame");
const readerLang = document.querySelector("#reader-lang");
const readerSize = document.querySelector("#reader-size");
const readerSpacing = document.querySelector("#reader-spacing");
const readerTheme = document.querySelector("#reader-theme");
const closeReaderControls = document.querySelectorAll("[data-close-reader]");
const closePdfControls = document.querySelectorAll("[data-close-pdf]");
const deckStage = document.querySelector(".deck-stage");
const deckCards = document.querySelectorAll(".deck-card");
const deckChoice = document.querySelector("#deck-choice");
const novelRotateControls = document.querySelectorAll("[data-novel-rotate]");
const languageControls = document.querySelectorAll("[data-language]");
const writings = window.WRITING_DATA?.items || [];
const contentItems = window.CONTENT_INDEX?.items || [];
const novelItems = contentItems.filter((item) => item.type === "novel");
const galleryItems = contentItems.filter((item) => item.type === "gallery");
const essayItems = contentItems.filter((item) => item.type === "essay");
const paperItems = contentItems.filter((item) => item.type === "paper");
const topLevelNovelItems = novelItems.filter((item) => item.topLevel !== false);
const topLevelGalleryItems = galleryItems.filter((item) => item.topLevel !== false);
const topLevelEssayItems = essayItems.filter((item) => item.topLevel !== false);
const topLevelPaperItems = paperItems.filter((item) => item.topLevel !== false);
const novelOrbit = {
  angle: 0,
  direction: 0.14,
  frame: null,
  lastTime: 0,
  pressedDirection: 0,
};
const defaultReaderSettings = {
  lang: "en",
  size: "medium",
  spacing: "normal",
  theme: "light",
};

function getSavedReaderSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("readerSettings") || "{}");
    if (!localStorage.getItem("siteLanguage")) {
      delete saved.lang;
    }
    return saved;
  } catch {
    return {};
  }
}

function saveReaderSettings() {
  try {
    localStorage.setItem("readerSettings", JSON.stringify(readerSettings));
    localStorage.setItem("siteLanguage", readerSettings.lang);
  } catch {
    // Ignore storage errors in local file previews or private browsing.
  }
}

const readerSettings = {
  ...defaultReaderSettings,
  ...getSavedReaderSettings(),
};
let currentReader = {
  type: "",
  id: "",
};

const staticCopy = {
  ".hero h1": {
    en: "Brachio Island Studio is a one-person island staged as a working crew.",
    ko: "Brachio Island Studio는 한 사람의 작업을 여러 명의 크루처럼 재배치한 섬입니다.",
  },
  ".crew-roster article:nth-child(1) em": {
    en: "systems / models / tools",
    ko: "시스템 / 모델 / 도구",
  },
  ".crew-roster article:nth-child(2) em": {
    en: "images / interfaces / scenes",
    ko: "이미지 / 인터페이스 / 장면",
  },
  ".crew-roster article:nth-child(3) em": {
    en: "fiction / memory / futures",
    ko: "소설 / 기억 / 미래",
  },
  ".crew-roster article:nth-child(4) em": {
    en: "art / faith / production",
    ko: "예술 / 신앙 / 생산",
  },
  "#identity .identity-profile > p": {
    en: "Brachio Island Studio reframes one practice as a small crew. Engineering funds the island, art gives it weather, fiction gives it memory, and aesthetics keeps asking why the image matters.",
    ko: "Brachio Island Studio는 한 사람의 작업을 작은 크루처럼 다시 배치합니다. 엔지니어링은 섬을 유지하고, 예술은 날씨를 만들고, 소설은 기억을 남기며, 미학은 이미지가 왜 중요한지 계속 묻습니다.",
  },
  "#career-heading": { en: "Roles", ko: "Roles" },
  "#education-heading": { en: "Background", ko: "Background" },
  "#career .cv-group:first-child article:nth-child(1) p": {
    en: "Builds generative image systems, model pipelines, and production tools.",
    ko: "생성 이미지 시스템, 모델 파이프라인, 프로덕션 도구를 만듭니다.",
  },
  "#career .cv-group:first-child article:nth-child(2) p": {
    en: "Turns models, images, and interfaces into visual works and image experiments.",
    ko: "모델, 이미지, 인터페이스를 시각 작업과 이미지 실험으로 전환합니다.",
  },
  "#career .cv-group:first-child article:nth-child(3) p": {
    en: "Writes fiction as an archive of speculative memory, belief, and damaged futures.",
    ko: "추측적 기억, 믿음, 손상된 미래를 소설의 아카이브로 씁니다.",
  },
  "#career .cv-group:first-child article:nth-child(4) p": {
    en: "Studies how technology, faith, originality, and production reshape art.",
    ko: "기술, 신앙, 독창성, 생산성이 예술을 어떻게 바꾸는지 연구합니다.",
  },
  "#career .cv-group:last-child article:nth-child(1) p": {
    en: "NC AI, Visual Content Service Division, Generative AI Research Engineer",
    ko: "NC AI, 비주얼 콘텐츠 서비스실, 생성형 AI 연구 엔지니어",
  },
  "#career .cv-group:last-child article:nth-child(2) p": {
    en: "NCSOFT, Image Generation Team, Generative AI Research Engineer",
    ko: "NCSOFT, 이미지 생성팀, 생성형 AI 연구 엔지니어",
  },
  "#career .cv-group:last-child article:nth-child(3) p": {
    en: "M.S. in Computer Graphics, Deep Image Recolorization using Histogram Analogy",
    ko: "컴퓨터 그래픽스 석사, Deep Image Recolorization using Histogram Analogy",
  },
  "#projects article:nth-child(1) p": {
    en: "Diffusion-model-based image generation AI SaaS",
    ko: "확산 모델 기반 이미지 생성 AI SaaS",
  },
  "#projects article:nth-child(2) p": {
    en: "Research for foundation model construction and related adapter development",
    ko: "기본 기초 모델 구축 및 관련 어댑터 개발을 위한 연구 수행",
  },
  "#projects article:nth-child(3) p": {
    en: "Led virtual try-on technology development using multi-GPU training for LoRA-based generative models",
    ko: "LoRA 기반 생성 모델의 멀티 GPU 학습을 활용한 가상 피팅 기술 개발 주도",
  },
  "#projects article:nth-child(4) p": {
    en: "Designed and implemented multi-view image generation features, including data refinement, model training, and AI architecture design",
    ko: "데이터 정제, 모델 학습, AI 아키텍처 설계를 포함한 멀티뷰 이미지 생성 기능 설계 및 구현",
  },
  "#projects article:nth-child(5) p": {
    en: "Researched controllable image generation and conditional pipelines for high-resolution landscape synthesis",
    ko: "고해상도 풍경 이미지 합성을 위한 조건부 파이프라인 및 제어 가능한 이미지 생성 연구",
  },
  "#projects .role-note": {
    en: "ROLE 01 / ENGINEERING LAB / IMAGE SYSTEMS",
    ko: "ROLE 01 / ENGINEERING LAB / 이미지 시스템",
  },
  "#gallery .role-note": {
    en: "ROLE 02 / IMAGE ROOM / VISUAL OUTPUTS",
    ko: "ROLE 02 / IMAGE ROOM / 시각 산출물",
  },
  "#gallery .section-note": {
    en: "The visual artist pulls image works from markdown items with <code>type: gallery</code>.",
    ko: "Visual Artist는 markdown frontmatter의 <code>type: gallery</code> 항목에서 이미지 작업을 불러옵니다.",
  },
  "#essay .role-note": {
    en: "ROLE 04 / READING ROOM / ESSAY FILES",
    ko: "ROLE 04 / READING ROOM / 에세이 파일",
  },
  "#essay .section-note": {
    en: "The aesthetics researcher gathers essays from markdown items with <code>type: essay</code>. PDF works open in the reader.",
    ko: "Aesthetics Researcher는 markdown frontmatter의 <code>type: essay</code> 항목에서 에세이를 모읍니다. PDF 작업은 리더에서 열립니다.",
  },
  "#paper .role-note": {
    en: "ROLE 01 + 04 / PAPER CABINET / TECHNICAL RECORDS",
    ko: "ROLE 01 + 04 / PAPER CABINET / 기술 기록",
  },
  "#paper .section-note": {
    en: "Research files and papers remain available as PDF records from the studio archive.",
    ko: "논문과 연구 파일은 스튜디오 아카이브의 PDF 기록으로 남겨둡니다.",
  },
  "#writing .role-note": {
    en: "ROLE 03 / FICTION ARCHIVE / NOVEL WHEEL",
    ko: "ROLE 03 / FICTION ARCHIVE / 소설 휠",
  },
  "#writing .section-note": {
    en: "The novel writer keeps fiction in markdown items with <code>type: novel</code>. Notion rendering remains as a secondary option.",
    ko: "Novel Writer는 markdown frontmatter의 <code>type: novel</code> 항목에 소설을 보관합니다. Notion 렌더링은 보조 옵션으로 남겨둡니다.",
  },
  "#reader-title": { en: "Select a text", ko: "글을 선택하세요" },
  "#pdf-title": { en: "Select a PDF", ko: "PDF를 선택하세요" },
};

function applyStaticCopy() {
  const lang = readerSettings.lang === "ko" ? "ko" : "en";
  document.documentElement.lang = lang;
  Object.entries(staticCopy).forEach(([selector, copy]) => {
    if (selector === "#reader-title" && currentReader.type) return;
    if (selector === "#pdf-title" && currentReader.type === "pdf") return;
    const element = document.querySelector(selector);
    if (!element) return;
    if (copy[lang].includes("<")) {
      element.innerHTML = copy[lang];
    } else {
      element.textContent = copy[lang];
    }
  });
  languageControls.forEach((control) => {
    control.classList.toggle("is-active", control.dataset.language === lang);
  });
}

function refreshLocalizedContent() {
  applyStaticCopy();
  renderEssayList();
  renderPaperList();
  renderWritingList();
  renderGalleryList();
  if (currentReader.type === "content") {
    renderMarkdownReader(currentReader.id);
  }
  if (currentReader.type === "pdf") {
    const item = findContentById(currentReader.id);
    if (item && pdfTitle) pdfTitle.textContent = getLocalizedTitle(item);
  }
}

function setLanguage(lang) {
  readerSettings.lang = lang === "ko" ? "ko" : "en";
  applyReaderSettings();
  refreshLocalizedContent();
}

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

function findContentById(id) {
  return contentItems.find((item) => item.id === id) || null;
}

function findWritingByContent(item) {
  const sourceUrl = item?.meta?.sourceUrl;
  const sourceId = sourceUrl ? normalizeNotionId(sourceUrl) : "";
  return writings.find((writing) => writing.id === item?.id || writing.id === sourceId) || null;
}

function findContentByHref(href) {
  const targetId = normalizeNotionId(href);
  if (!targetId) return null;
  return contentItems.find((item) => item.id === targetId || normalizeNotionId(item.meta?.sourceUrl || "") === targetId) || null;
}

function getLocalizedTitle(item) {
  if (!item) return "";
  if (readerSettings.lang === "en") return item.titleEn || item.titleKo || item.title;
  return item.titleKo || item.title || item.titleEn;
}

function getLocalizedMarkdown(item) {
  if (!item) return "";
  if (readerSettings.lang === "en") return item.markdownEn || item.markdownKo || item.markdown || "";
  return item.markdownKo || item.markdown || item.markdownEn || "";
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
  if (!writingList || topLevelNovelItems.length === 0) return;
  const repeatCount = Math.max(2, Math.ceil(22 / topLevelNovelItems.length));
  const visualNovelItems = Array.from({ length: repeatCount }, (_, repeatIndex) =>
    topLevelNovelItems.map((_, itemIndex) => topLevelNovelItems[(itemIndex + repeatIndex) % topLevelNovelItems.length])
  ).flat();

  writingList.replaceChildren(
    ...visualNovelItems.map((item, index) => {
      const originalIndex = topLevelNovelItems.findIndex((novel) => novel.id === item.id);
      const notionItem = findWritingByContent(item);
      const card = document.createElement("article");
      const label = document.createElement("span");
      const title = document.createElement("strong");
      const tags = document.createElement("span");
      const meta = document.createElement("em");
      const options = document.createElement("span");
      const notionButton = document.createElement("button");

      card.className = originalIndex % 3 === 1 ? "novel-card novel-card-blue" : "novel-card";
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.dataset.orbitIndex = String(index);
      card.addEventListener("click", () => renderMarkdownReader(item.id, true));
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          renderMarkdownReader(item.id, true);
        }
      });
      label.textContent = String(originalIndex + 1).padStart(2, "0");
      title.textContent = getLocalizedTitle(item);
      tags.className = "novel-card-tags";
      tags.textContent = (item.meta?.tags || []).slice(0, 3).join(" ");
      meta.textContent = "MARKDOWN NOVEL";
      options.className = "novel-card-actions";
      notionButton.type = "button";
      notionButton.textContent = "Notion";
      notionButton.disabled = !notionItem;
      notionButton.addEventListener("click", (event) => {
        event.stopPropagation();
        if (notionItem) renderReader(notionItem.id, true);
      });

      options.append(notionButton);
      card.append(label, title, tags, meta, options);
      return card;
    })
  );

  startNovelOrbit();
}

function normalizeAngle(angle) {
  return ((((angle + 180) % 360) + 360) % 360) - 180;
}

function positionNovelOrbitCards() {
  if (!writingList) return;
  const cards = Array.from(writingList.querySelectorAll(".novel-card"));
  if (cards.length === 0) return;

  const deckWidth = writingList.clientWidth || 860;
  const deckHeight = writingList.clientHeight || 460;
  const radius = Math.min(deckWidth * 0.72, 820);
  const visibleLimit = 86;
  const step = 24;

  cards.forEach((card, index) => {
    const rawAngle = index * step + novelOrbit.angle;
    const angle = normalizeAngle(rawAngle);
    const radians = (angle * Math.PI) / 180;
    const distance = Math.abs(angle);
    const x = Math.sin(radians) * radius;
    const y = -Math.cos(radians) * Math.min(radius, deckHeight * 0.94);
    const isVisible = distance <= visibleLimit;
    const scale = isVisible ? Math.max(0.76, 1 - distance / 310) : 0.66;
    const opacity = isVisible ? 1 : 0;
    const layer = isVisible ? Math.max(1, Math.round(33 * (1 - distance / visibleLimit))) : 1;

    card.style.setProperty("--orbit-x", `${x.toFixed(2)}px`);
    card.style.setProperty("--orbit-y", `${y.toFixed(2)}px`);
    card.style.setProperty("--orbit-rotation", `${angle.toFixed(2)}deg`);
    card.style.setProperty("--orbit-scale", scale.toFixed(3));
    card.style.setProperty("--orbit-opacity", opacity.toFixed(3));
    card.style.setProperty("--orbit-layer", String(layer));
    card.style.setProperty("--orbit-pointer", isVisible ? "auto" : "none");
    card.setAttribute("aria-hidden", String(!isVisible));
    card.tabIndex = isVisible ? 0 : -1;
  });
}

function tickNovelOrbit(time) {
  if (!novelOrbit.lastTime) novelOrbit.lastTime = time;
  const delta = Math.min(time - novelOrbit.lastTime, 40);
  novelOrbit.lastTime = time;
  const speed = novelOrbit.pressedDirection || novelOrbit.direction;
  novelOrbit.angle = normalizeAngle(novelOrbit.angle + speed * delta * 0.018);
  positionNovelOrbitCards();
  novelOrbit.frame = requestAnimationFrame(tickNovelOrbit);
}

function startNovelOrbit() {
  if (!writingList) return;
  positionNovelOrbitCards();

  if (!writingList.dataset.orbitBound) {
    writingList.dataset.orbitBound = "true";
    window.addEventListener("resize", positionNovelOrbitCards);
  }

  if (!novelOrbit.frame) {
    novelOrbit.lastTime = 0;
    novelOrbit.frame = requestAnimationFrame(tickNovelOrbit);
  }
}

function rotateNovelOrbit(direction) {
  const step = 24;
  novelOrbit.angle = normalizeAngle(novelOrbit.angle + direction * step);
  novelOrbit.direction = direction * 0.14;
  positionNovelOrbitCards();
}

function bindNovelOrbitControls() {
  novelRotateControls.forEach((control) => {
    const direction = Number(control.dataset.novelRotate) || 1;
    control.addEventListener("click", () => rotateNovelOrbit(direction));
    control.addEventListener("pointerdown", () => {
      novelOrbit.pressedDirection = direction * 0.9;
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach((eventName) => {
      control.addEventListener(eventName, () => {
        novelOrbit.pressedDirection = 0;
      });
    });
  });
}

function renderEssayList() {
  if (!essayList || topLevelEssayItems.length === 0) return;

  essayList.replaceChildren(
    ...topLevelEssayItems.map((item, index) => {
      const row = document.createElement("article");
      const label = document.createElement("span");
      const body = document.createElement("p");
      const title = document.createElement("span");
      const options = document.createElement("span");
      const readButton = document.createElement("button");

      label.textContent = `essay ${String(index + 1).padStart(2, "0")}`;
      title.className = "writing-title";
      title.textContent = getLocalizedTitle(item);
      options.className = "source-options";
      readButton.type = "button";
      readButton.textContent = item.meta?.format === "pdf" ? "PDF" : "Read";
      readButton.addEventListener("click", () => {
        if (item.meta?.format === "pdf") {
          renderPdfReader(item.id);
        } else {
          renderMarkdownReader(item.id, true);
        }
      });

      options.append(readButton);
      body.append(title, options);
      row.append(label, body);
      return row;
    })
  );
}

function renderPaperList() {
  if (!paperList || topLevelPaperItems.length === 0) return;

  paperList.replaceChildren(
    ...topLevelPaperItems.map((item, index) => {
      const row = document.createElement("article");
      const label = document.createElement("span");
      const body = document.createElement("p");
      const title = document.createElement("span");
      const options = document.createElement("span");
      const readButton = document.createElement("button");

      label.textContent = `paper ${String(index + 1).padStart(2, "0")}`;
      title.className = "writing-title";
      title.textContent = getLocalizedTitle(item);
      options.className = "source-options";
      readButton.type = "button";
      readButton.textContent = item.meta?.format === "pdf" ? "PDF" : "Read";
      readButton.addEventListener("click", () => {
        if (item.meta?.format === "pdf") {
          renderPdfReader(item.id);
        } else {
          renderMarkdownReader(item.id, true);
        }
      });

      options.append(readButton);
      body.append(title, options);
      row.append(label, body);
      return row;
    })
  );
}

function renderGalleryList() {
  if (!galleryList || topLevelGalleryItems.length === 0) return;

  galleryList.replaceChildren(
    ...topLevelGalleryItems.map((item) => {
      const figure = document.createElement("figure");
      const button = document.createElement("button");
      const imagePath = item.meta?.image;
      const caption = document.createElement("figcaption");

      button.type = "button";
      button.addEventListener("click", () => renderMarkdownReader(item.id, true));

      if (imagePath) {
        const image = document.createElement("img");
        image.src = imagePath;
        image.alt = item.title;
        image.loading = "lazy";
        button.append(image);
      } else {
        button.append(document.createElement("div"));
      }

      caption.textContent = item.title;
      caption.textContent = getLocalizedTitle(item);
      button.append(caption);
      figure.append(button);
      return figure;
    })
  );
}

function setActiveDeckCard(selectedCard) {
  if (!selectedCard || !deckStage) return;
  deckCards.forEach((card) => {
    card.classList.toggle("is-active", card === selectedCard);
  });
  const activeIndex = [...deckCards].indexOf(selectedCard);
  deckStage.dataset.active = String(activeIndex);
  if (deckChoice) {
    deckChoice.dataset.target = selectedCard.dataset.target;
    deckChoice.querySelector("strong").textContent = selectedCard.querySelector("strong").textContent;
  }
}

function bindScreenDeck() {
  deckCards.forEach((card) => {
    card.addEventListener("mouseenter", () => {
      if (!deckChoice) return;
      deckChoice.dataset.target = card.dataset.target;
      deckChoice.querySelector("strong").textContent = card.querySelector("strong").textContent;
    });
    card.addEventListener("mouseleave", () => {
      const activeCard = document.querySelector(".deck-card.is-active") || deckCards[0];
      if (activeCard) setActiveDeckCard(activeCard);
    });
    card.addEventListener("click", () => {
      setActiveDeckCard(card);
      const target = document.querySelector(`#${card.dataset.target}`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  });

  deckChoice?.addEventListener("click", () => {
    const target = document.querySelector(`#${deckChoice.dataset.target}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
}

function openReader() {
  if (!readerModal) return;
  readerModal.classList.add("is-open");
  readerModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("reader-open");
}

function openPdf() {
  if (!pdfModal) return;
  pdfModal.classList.add("is-open");
  pdfModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("pdf-open");
}

function applyReaderSettings() {
  if (!readerWindow) return;
  readerWindow.dataset.lang = readerSettings.lang;
  readerWindow.dataset.size = readerSettings.size;
  readerWindow.dataset.spacing = readerSettings.spacing;
  readerWindow.dataset.theme = readerSettings.theme;

  if (readerLang) readerLang.value = readerSettings.lang;
  if (readerSize) readerSize.value = readerSettings.size;
  if (readerSpacing) readerSpacing.value = readerSettings.spacing;
  if (readerTheme) readerTheme.value = readerSettings.theme;

  saveReaderSettings();
}

function bindReaderSetting(control, key) {
  if (!control) return;
  control.addEventListener("change", () => {
    if (key === "lang") {
      setLanguage(control.value);
      return;
    }
    readerSettings[key] = control.value;
    applyReaderSettings();
    refreshLocalizedContent();
  });
}

function closeReader() {
  if (!readerModal) return;
  readerModal.classList.remove("is-open");
  readerModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("reader-open");
}

function closePdf() {
  if (!pdfModal) return;
  pdfModal.classList.remove("is-open");
  pdfModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("pdf-open");
  if (pdfFrame) pdfFrame.removeAttribute("src");
}

function appendMarkdownInline(parent, text) {
  const pattern = /(!)?\[([^\]]+)\]\(([^)]+)\)/g;
  let cursor = 0;
  let match = pattern.exec(text);

  while (match) {
    if (match.index > cursor) {
      parent.append(document.createTextNode(text.slice(cursor, match.index)));
    }

    const [, isImage, label, href] = match;
    if (isImage) {
      const image = document.createElement("img");
      image.src = href;
      image.alt = label;
      image.loading = "lazy";
      parent.append(image);
    } else if (href.startsWith("notion:")) {
      const contentItem = findContentByHref(href);
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.addEventListener("click", () => {
        if (contentItem) renderMarkdownReader(contentItem.id, true);
      });
      button.disabled = !contentItem;
      parent.append(button);
    } else {
      const link = document.createElement("a");
      link.href = href;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = label;
      parent.append(link);
    }

    cursor = pattern.lastIndex;
    match = pattern.exec(text);
  }

  if (cursor < text.length) {
    parent.append(document.createTextNode(text.slice(cursor)));
  }
}

function createMarkdownBlock(lines) {
  const text = lines.join(" ").trim();
  if (!text) return null;

  if (text.startsWith("## ")) {
    const heading = document.createElement("h3");
    appendMarkdownInline(heading, text.slice(3));
    return heading;
  }

  if (text.startsWith("# ")) {
    const heading = document.createElement("h3");
    appendMarkdownInline(heading, text.slice(2));
    return heading;
  }

  if (/^!?\[[^\]]+\]\([^)]+\)$/.test(text) && text.startsWith("!")) {
    const figure = document.createElement("figure");
    figure.className = "notion-media markdown-media";
    appendMarkdownInline(figure, text);
    return figure;
  }

  const paragraph = document.createElement("p");
  paragraph.className = "markdown-block";
  appendMarkdownInline(paragraph, text);
  return paragraph;
}

function renderMarkdown(markdown = "", title = "") {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let buffer = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const isFirstTitle = index === 0 && trimmed === `# ${title}`;

    if (isFirstTitle) return;
    if (!trimmed) {
      const block = createMarkdownBlock(buffer);
      if (block) blocks.push(block);
      buffer = [];
      return;
    }

    if (trimmed.startsWith("# ") || trimmed.startsWith("## ") || trimmed.startsWith("![")) {
      const block = createMarkdownBlock(buffer);
      if (block) blocks.push(block);
      buffer = [trimmed];
      return;
    }

    buffer.push(trimmed);
  });

  const lastBlock = createMarkdownBlock(buffer);
  if (lastBlock) blocks.push(lastBlock);
  return blocks;
}

function renderMarkdownReader(id, shouldOpen = false) {
  const item = findContentById(id) || contentItems[0];
  if (!item || !readerTitle || !readerSource || !readerContent) return;
  currentReader = { type: "content", id: item.id };

  const title = getLocalizedTitle(item);
  readerTitle.textContent = title;
  readerSource.href = `../${item.path}`;
  readerSource.textContent = "open source";
  readerSource.target = "_blank";
  readerSource.rel = "noreferrer";

  readerContent.replaceChildren(...renderMarkdown(getLocalizedMarkdown(item), title));
  readerContent.scrollTop = 0;
  if (shouldOpen) {
    openReader();
  }
}

function renderPdfReader(id) {
  const item = findContentById(id);
  if (!item || !pdfTitle || !pdfSource || !pdfFrame || !item.meta?.pdf) return;

  currentReader = { type: "pdf", id: item.id };
  const title = getLocalizedTitle(item);
  pdfTitle.textContent = title;
  pdfSource.href = item.meta.pdf;
  pdfSource.target = "_blank";
  pdfSource.rel = "noreferrer";
  pdfFrame.src = item.meta.pdf;
  pdfFrame.title = title;
  openPdf();
}

function renderReader(id, shouldOpen = false) {
  const item = writings.find((writing) => writing.id === id) || writings[0];
  if (!item || !readerTitle || !readerSource || !readerContent) return;
  currentReader = { type: "notion", id: item.id };

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

closePdfControls.forEach((control) => {
  control.addEventListener("click", closePdf);
});

if (readerContent) {
  ["copy", "cut", "contextmenu", "selectstart"].forEach((eventName) => {
    readerContent.addEventListener(eventName, (event) => event.preventDefault());
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeReader();
    closePdf();
  }
});

bindReaderSetting(readerLang, "lang");
bindReaderSetting(readerSize, "size");
bindReaderSetting(readerSpacing, "spacing");
bindReaderSetting(readerTheme, "theme");
languageControls.forEach((control) => {
  control.addEventListener("click", () => setLanguage(control.dataset.language));
});
applyReaderSettings();
refreshLocalizedContent();
bindNovelOrbitControls();
bindScreenDeck();
if (contentItems[0]) {
  renderMarkdownReader(contentItems[0].id);
}
