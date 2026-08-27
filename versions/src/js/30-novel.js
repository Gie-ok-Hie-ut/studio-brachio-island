function setNovelBookTitle(titleNode, item) {
  const titleText = getLocalizedTitle(item);
  const solidLength = Array.from(titleText.replace(/[\s-]/g, "")).length;
  const hasNaturalBreak = /[\s-]/.test(titleText);
  const longestSegmentLength = titleText
    .split(/[\s-]+/)
    .filter(Boolean)
    .reduce((maxLength, segment) => Math.max(maxLength, Array.from(segment).length), 0);

  titleNode.className = "novel-book-title";
  titleNode.dataset.titleFlow = hasNaturalBreak ? "natural" : "solid";
  if (longestSegmentLength >= 8) {
    titleNode.dataset.titleFit = "tight";
  } else if (!hasNaturalBreak && solidLength >= 5) {
    titleNode.dataset.titleFit = "compact";
  }

  titleNode.replaceChildren();
  titleText.split(/(-)/).forEach((part) => {
    if (!part) return;
    titleNode.append(document.createTextNode(part));
    if (part === "-") titleNode.append(document.createElement("wbr"));
  });
}

function createNovelCard(item, index) {
  const originalIndex = topLevelNovelItems.findIndex((novel) => novel.id === item.id);
  const coverAsset = getNovelCoverAsset(item);
  const hookText = getMetaText(item, "summary", "");
  const card = document.createElement("article");
  const cover = document.createElement("span");
  const label = document.createElement("span");
  const copy = document.createElement("span");
  const title = document.createElement("strong");
  const tags = document.createElement("span");
  const overlay = document.createElement("span");
  const overlayText = document.createElement("span");

  card.className = originalIndex % 3 === 1 ? "novel-card novel-card-blue" : "novel-card";
  if (coverAsset) {
    const image = document.createElement("img");
    card.classList.add("novel-card-with-cover");
    cover.className = "novel-card-cover";
    image.src = projectHref(coverAsset);
    image.alt = getLocalizedTitle(item);
    image.loading = "lazy";
    cover.append(image);
  }
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.dataset.orbitIndex = String(index);
  const canOpenFromCard = () => {
    const panel = card.closest("[data-role-panel]");
    return panel
      ? panel.classList.contains("is-expanded") && panel.classList.contains("is-detail-ready")
      : true;
  };

  card.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!canOpenFromCard()) return;
    renderMarkdownReader(item.id, true);
  });
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      if (!canOpenFromCard()) return;
      renderMarkdownReader(item.id, true);
    }
  });
  label.textContent = String(originalIndex + 1).padStart(2, "0");
  copy.className = "novel-card-copy";
  setNovelBookTitle(title, item);
  tags.className = "novel-card-tags";
  tags.textContent = (item.meta?.tags || []).join(" ");
  overlay.className = "novel-card-overlay";
  overlayText.className = "novel-card-overlay-text";
  overlayText.textContent = hookText || getLocalizedTitle(item);
  overlay.append(overlayText);
  copy.append(title, tags);
  card.append(cover, label, copy, overlay);
  return card;
}

function createNovelGridBook(item) {
  const originalIndex = topLevelNovelItems.findIndex((novel) => novel.id === item.id);
  const coverAsset = getNovelCoverAsset(item);
  const hookText = getMetaText(item, "summary", "");
  const book = document.createElement("article");
  const cover = document.createElement("span");
  const label = document.createElement("span");
  const copy = document.createElement("span");
  const title = document.createElement("strong");
  const tags = document.createElement("span");
  const overlay = document.createElement("span");
  const overlayText = document.createElement("span");

  book.className = originalIndex % 3 === 1 ? "novel-grid-book novel-grid-book-blue" : "novel-grid-book";
  if (coverAsset) {
    const image = document.createElement("img");
    book.classList.add("novel-grid-book-with-cover");
    cover.className = "novel-grid-book-cover";
    image.src = projectHref(coverAsset);
    image.alt = getLocalizedTitle(item);
    image.loading = "lazy";
    cover.append(image);
  }

  book.tabIndex = 0;
  book.setAttribute("role", "button");
  book.addEventListener("click", (event) => {
    event.stopPropagation();
    renderMarkdownReader(item.id, true);
  });
  book.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      renderMarkdownReader(item.id, true);
    }
  });

  label.textContent = String(originalIndex + 1).padStart(2, "0");
  copy.className = "novel-grid-book-copy";
  setNovelBookTitle(title, item);
  tags.className = "novel-grid-book-tags";
  tags.textContent = (item.meta?.tags || []).join(" ");
  overlay.className = "novel-grid-book-overlay";
  overlayText.className = "novel-grid-book-overlay-text";
  overlayText.textContent = hookText || getLocalizedTitle(item);
  overlay.append(overlayText);
  copy.append(title, tags);
  book.append(cover, label, copy, overlay);
  return book;
}

function createTodaysSignalNovelBook(item) {
  const sourceBook = createNovelGridBook(item);
  const book = sourceBook.cloneNode(true);
  book.classList.add("todays-signal-novel-book");
  book.removeAttribute("role");
  book.removeAttribute("tabindex");
  book.setAttribute("aria-hidden", "true");
  return book;
}

function createNovelGridCell(item) {
  const cell = document.createElement("div");
  cell.className = "novel-grid-cell";
  cell.id = getContentAnchorId(item);
  cell.dataset.contentId = item.id;
  cell.append(createNovelGridBook(item));
  return cell;
}

function getVisualNovelItems(minimum = 22) {
  if (topLevelNovelItems.length === 0) return [];
  const repeatCount = Math.max(2, Math.ceil(minimum / topLevelNovelItems.length));
  return Array.from({ length: repeatCount }, (_, repeatIndex) =>
    topLevelNovelItems.map((_, itemIndex) => topLevelNovelItems[(itemIndex + repeatIndex) % topLevelNovelItems.length])
  ).flat();
}

function normalizeAngle(angle) {
  return ((((angle + 180) % 360) + 360) % 360) - 180;
}

function getNovelOrbitContainers() {
  return [...document.querySelectorAll("[data-novel-view-stage='orbit']")].filter(
    (container) => !container.hidden && container.querySelector(".novel-card")
  );
}

function resetNovelHoverVelocity() {
  novelOrbit.targetVelocity = novelOrbit.defaultVelocity;
}

function updateNovelPointerVelocity(event) {
  const container = event.currentTarget;
  if (!container || container.hidden) return;

  const containerRect = container.getBoundingClientRect();
  const containerCenterX = containerRect.left + containerRect.width / 2;
  const lowerThreshold = containerRect.top + containerRect.height * 0.28;
  const pointerX = event.clientX;
  const pointerY = event.clientY;
  const centerDeadZone = containerRect.width * 0.12;
  const halfWidth = containerRect.width / 2;
  const distanceFromCenter = pointerX - containerCenterX;

  if (pointerY < lowerThreshold || Math.abs(distanceFromCenter) <= centerDeadZone) {
    novelOrbit.targetVelocity = NOVEL_SLOW_VELOCITY;
    return;
  }

  const travel = Math.max(halfWidth - centerDeadZone, 1);
  const strength = clamp((Math.abs(distanceFromCenter) - centerDeadZone) / travel);
  const sideVelocity = distanceFromCenter < 0 ? NOVEL_HOVER_VELOCITY : -NOVEL_HOVER_VELOCITY;
  novelOrbit.targetVelocity = NOVEL_SLOW_VELOCITY + (sideVelocity - NOVEL_SLOW_VELOCITY) * strength;
}

function positionNovelOrbitCards() {
  const containers = getNovelOrbitContainers();
  if (containers.length === 0) return;

  containers.forEach((container) => {
    const cards = Array.from(container.querySelectorAll(".novel-card"));
    if (cards.length === 0) return;

    const deckWidth = container.clientWidth || 860;
    const deckHeight = container.clientHeight || 460;
    const isRoleNovelStage = container.classList.contains("role-novel-stage");
    const radius = Math.min(deckWidth * (isRoleNovelStage ? 0.44 : 0.72), isRoleNovelStage ? 600 : 820);
    const verticalRadius = Math.min(radius, deckHeight * (isRoleNovelStage ? 0.68 : 0.94));
    const visibleLimit = isRoleNovelStage ? 78 : 86;
    const step = 24;
    const centerIndex = isRoleNovelStage ? Math.floor(cards.length / 2) : 0;

    cards.forEach((card, index) => {
      const rawAngle = (index - centerIndex) * step + novelOrbit.angle;
      const angle = normalizeAngle(rawAngle);
      const radians = (angle * Math.PI) / 180;
      const distance = Math.abs(angle);
      const x = Math.sin(radians) * radius;
      const y = -Math.cos(radians) * verticalRadius;
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
  });
}

function tickNovelOrbit(time) {
  if (!novelOrbit.lastTime) novelOrbit.lastTime = time;
  const delta = Math.min(time - novelOrbit.lastTime, 40);
  novelOrbit.lastTime = time;
  const velocityEase = 1 - Math.pow(0.001, delta / NOVEL_VELOCITY_EASE_MS);
  novelOrbit.velocity += (novelOrbit.targetVelocity - novelOrbit.velocity) * velocityEase;
  novelOrbit.angle = normalizeAngle(novelOrbit.angle + novelOrbit.velocity * delta * 0.018);
  positionNovelOrbitCards();
  novelOrbit.frame = requestAnimationFrame(tickNovelOrbit);
}

function startNovelOrbit() {
  positionNovelOrbitCards();

  if (!novelOrbit.bound) {
    novelOrbit.bound = true;
    window.addEventListener("resize", positionNovelOrbitCards);
  }

  if (!novelOrbit.frame) {
    novelOrbit.lastTime = 0;
    novelOrbit.frame = requestAnimationFrame(tickNovelOrbit);
  }
}

function stopNovelOrbit() {
  if (novelOrbit.frame) {
    cancelAnimationFrame(novelOrbit.frame);
    novelOrbit.frame = null;
    novelOrbit.lastTime = 0;
  }
}

function resetNovelGridScroll() {
  document.querySelectorAll("[data-novel-view-stage='grid']").forEach((stage) => {
    stage.scrollTop = 0;
    stage.scrollLeft = 0;
  });
}

function updateNovelViewControls() {
  document.querySelectorAll("[data-novel-view]").forEach((control) => {
    const isActive = control.dataset.novelView === novelView.mode;
    control.classList.toggle("is-active", isActive);
    control.setAttribute("aria-pressed", String(isActive));
  });
}

function syncNovelViewMode() {
  document.querySelectorAll(".role-section-body-novel").forEach((body) => {
    body.dataset.novelViewMode = novelView.mode;
  });
  document.querySelectorAll("[data-novel-view-stage]").forEach((stage) => {
    const isActive = stage.dataset.novelViewStage === novelView.mode;
    stage.hidden = !isActive;
    stage.style.display = isActive ? "" : "none";
    stage.style.visibility = isActive ? "" : "hidden";
    stage.style.pointerEvents = isActive ? "" : "none";
    stage.setAttribute("aria-hidden", String(!isActive));
  });
  resetNovelHoverVelocity();
  updateNovelViewControls();
  if (novelView.mode === "orbit") {
    startNovelOrbit();
    requestAnimationFrame(positionNovelOrbitCards);
  } else {
    stopNovelOrbit();
    resetNovelGridScroll();
    requestAnimationFrame(resetNovelGridScroll);
  }
}

function bindNovelOrbitStage(container) {
  if (!container) return;
  if (container.dataset.novelPointerBound !== "true") {
    container.dataset.novelPointerBound = "true";
    container.addEventListener("pointermove", updateNovelPointerVelocity);
    container.addEventListener("pointerleave", resetNovelHoverVelocity);
  }
}

function renderNovelStages(orbitContainer, gridContainer) {
  if (orbitContainer) {
    bindNovelOrbitStage(orbitContainer);
    orbitContainer.replaceChildren(...getVisualNovelItems(18).map((item, index) => createNovelCard(item, index)));
  }

  if (gridContainer) {
    gridContainer.replaceChildren(...topLevelNovelItems.map((item) => createNovelGridCell(item)));
  }

  syncNovelViewMode();
}

function setNovelViewMode(mode) {
  const activeMode = mode === "grid" ? "grid" : "orbit";
  if (novelView.mode === activeMode) {
    syncNovelViewMode();
    return;
  }

  novelView.mode = activeMode;
  syncNovelViewMode();
}

function bindNovelViewControls() {
  document.querySelectorAll("[data-novel-view]").forEach((control) => {
    if (control.dataset.novelViewBound === "true") return;
    control.dataset.novelViewBound = "true";
    control.addEventListener("click", () => setNovelViewMode(control.dataset.novelView));
  });
  updateNovelViewControls();
}

function createNovelViewButton(mode, label) {
  const button = document.createElement("button");
  const icon = document.createElement("span");
  button.type = "button";
  button.className = "novel-view-button";
  button.dataset.novelView = mode;
  button.setAttribute("aria-label", label);
  button.setAttribute("aria-pressed", String(novelView.mode === mode));
  icon.className = `novel-view-icon novel-view-icon-${mode}`;
  button.append(icon);
  return button;
}
