function appendMarkdownText(parent, text, context = {}) {
  text.split("\n").forEach((line, index) => appendMarkdownLine(parent, line, index, context));
}

function renderProfileLinks(item, titleTarget, titleText) {
  const links = document.createElement("div");
  links.className = "role-profile-links";
  links.setAttribute("aria-label", `${getMetaText(item, "detailTitle", item.title)} links`);

  const appendLink = (label, href, iconType) => {
    if (!href) return;
    const link = document.createElement("a");
    link.href = href;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.setAttribute("aria-label", label);
    link.title = label;
    link.append(createProfileIcon(iconType));
    links.append(link);
  };

  appendLink("LinkedIn", item.meta?.linkedin, "linkedin");
  appendLink("Google Scholar", item.meta?.scholar, "scholar");

  if (item.meta?.cvPdf) {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", "CV");
    button.title = "CV";
    button.append(createProfileIcon("cv"));
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openPdfFile(`CV - ${titleText}`, item.meta.cvPdf);
    });
    links.append(button);
  }

  if (links.children.length > 0) {
    titleTarget.append(links);
  }
}

function renderIdentityRole(item, body) {
  const figure = document.createElement("figure");
  const image = document.createElement("img");
  const caption = document.createElement("figcaption");
  const statement =
    createRoleIntroNode(getLocalizedMarkdown(item), { item, basePath: item.path }) ||
    document.createElement("div");
  const residentImages = Array.isArray(item.meta?.residentImages) ? item.meta.residentImages : [];
  let activeResidentIndex = -1;

  body.classList.add("identity-detail");
  if (!statement.classList.contains("role-intro")) {
    statement.className = "role-intro";
  }

  figure.className = "identity-detail-portrait";
  image.alt = item.meta?.caption || getMetaText(item, "detailTitle", item.title);
  image.loading = "lazy";
  caption.textContent = item.meta?.caption || "";

  const setResidentImage = (entry = null) => {
    if (entry?.src) {
      const residentLabel = getLocalizedResidentLabel(entry);
      image.src = projectHref(entry.src);
      image.alt = residentLabel || getMetaText(item, "detailTitle", item.title);
      caption.textContent = residentLabel || "";
      return;
    }

    image.src = projectHref(item.meta?.image || "../assets/identity-portrait.png");
    image.alt = item.meta?.caption || getMetaText(item, "detailTitle", item.title);
    caption.textContent = item.meta?.caption || "";
  };

  const pickResidentImage = () => {
    if (residentImages.length === 0) return;
    let nextIndex = Math.floor(Math.random() * residentImages.length);
    if (residentImages.length > 1) {
      while (nextIndex === activeResidentIndex) {
        nextIndex = Math.floor(Math.random() * residentImages.length);
      }
    }
    activeResidentIndex = nextIndex;
    setResidentImage(residentImages[activeResidentIndex]);
  };

  if (residentImages.length > 0) {
    figure.tabIndex = 0;
    figure.setAttribute("role", "button");
    figure.setAttribute("aria-label", readerSettings.lang === "ko"
      ? "레지던트 이미지 무작위 선택"
      : "Randomize resident image");
    figure.addEventListener("click", pickResidentImage);
    figure.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        pickResidentImage();
      }
    });
    pickResidentImage();
  } else {
    setResidentImage();
  }

  figure.append(image, caption);
  body.append(statement, figure);
}

function renderCvRole(item, body) {
  const wrapper = document.createElement("div");
  wrapper.className = "engineer-scroll cv-scroll";

  const intro = createRoleIntroNode(getLocalizedMarkdown(item), {
    item,
    basePath: item.path,
  }, [ROLE_OVERVIEW_CLASS]);
  if (intro) {
    wrapper.append(intro);
  }

  parseRecordSections(getLocalizedMarkdown(item)).forEach((section) => {
    const block = document.createElement("section");
    const heading = document.createElement("h3");
    const list = document.createElement("div");
    block.className = "cv-block";
    heading.textContent = section.title;
    list.className = "cv-list";

    const sectionKey = section.title.toLowerCase();
    if (sectionKey === "projects") {
      list.id = "role-engineer-items";
      list.className = "role-items role-project-items cv-list";
    } else if (sectionKey === "paper") {
      list.id = "role-engineer-paper-items";
      list.className = "role-items role-paper-items cv-list";
    } else {
      const isActionSection = sectionKey === "article / media";
      section.rows.forEach((row) => {
        const article = document.createElement("article");
        const label = document.createElement("span");
        const text = document.createElement("p");
        const title = document.createElement("span");
        const actions = document.createElement("span");
        label.textContent = row.label;
        title.className = "cv-entry-title";
        appendMarkdownInline(title, row.text, {
          item,
          basePath: item.path,
        });
        text.append(title);
        if (row.detail && isActionSection) {
          article.classList.add("cv-link-row");
          actions.className = "cv-entry-actions";
          appendMarkdownInline(actions, row.detail, {
            item,
            basePath: item.path,
          });
          article.append(label, text, actions);
        } else if (row.detail) {
          const detail = document.createElement("small");
          detail.className = "cv-entry-detail";
          appendMarkdownInline(detail, row.detail, {
            item,
            basePath: item.path,
          });
          text.append(detail);
          article.append(label, text);
        } else {
          article.append(label, text);
        }
        list.append(article);
      });
    }

    block.append(heading, list);
    wrapper.append(block);
  });

  body.append(wrapper);
}

function renderGalleryRole(item, body) {
  const markdown = getLocalizedMarkdown(item);
  const introParagraphs = getRecordIntro(markdown);
  const children = [];

  if (introParagraphs.length > 0) {
    const intro = createRoleIntroNode(markdown, {
      item,
      basePath: item.path,
    }, [ROLE_OVERVIEW_CLASS]);
    if (intro) children.push(intro);
  }

  const target = document.createElement("div");
  target.id = "role-visual-items";
  target.className = "role-items role-gallery-items";
  children.push(target);
  body.replaceChildren(...children);
}

function renderNovelRole(item, body) {
  renderRoleMarkdownNote(getLocalizedMarkdown(item), body, {
    item,
    basePath: item.path,
  }, [ROLE_OVERVIEW_CLASS]);
  const controls = document.createElement("div");
  const orbit = createNovelViewButton("orbit", readerSettings.lang === "ko" ? "회전 보기" : "Rotation view");
  const grid = createNovelViewButton("grid", readerSettings.lang === "ko" ? "그리드 보기" : "Grid view");
  const orbitStage = document.createElement("div");
  const gridStage = document.createElement("div");

  controls.className = "novel-controls role-novel-controls";
  controls.setAttribute("aria-label", readerSettings.lang === "ko" ? "소설 보기 방식" : "Novel view controls");
  orbitStage.id = "role-novel-orbit-items";
  orbitStage.className = "role-novel-stage role-novel-orbit-stage novel-deck";
  orbitStage.dataset.novelViewStage = "orbit";
  gridStage.id = "role-novel-grid-items";
  gridStage.className = "role-novel-grid-stage";
  gridStage.dataset.novelViewStage = "grid";

  controls.append(orbit, grid);
  body.append(controls, orbitStage, gridStage);
}

function renderReadingRole(item, body) {
  renderRoleMarkdownNote(getLocalizedMarkdown(item), body, {
    item,
    basePath: item.path,
  }, [ROLE_OVERVIEW_CLASS]);
  const target = document.createElement("div");
  target.id = "role-aesthetics-items";
  target.className = "role-items role-paper-items role-essay-items";
  body.append(target);
}

function renderDefaultRole(item, body) {
  body.replaceChildren(...renderMarkdown(getLocalizedMarkdown(item), getLocalizedTitle(item), {
    item,
    basePath: item.path,
  }));
}

const ROLE_BODY_RENDERERS = {
  identity: renderIdentityRole,
  cv: renderCvRole,
  gallery: renderGalleryRole,
  novel: renderNovelRole,
  reading: renderReadingRole,
};

function renderRoleBody(item, body) {
  const layout = item.meta?.layout || "note";
  const renderer = ROLE_BODY_RENDERERS[layout] || renderDefaultRole;
  renderer(item, body);
}

function closeRolePanels() {
  window.clearTimeout(roleReadyTimer);
  rolePanels.forEach((panel) => panel.classList.remove("is-hovered", "is-detail-ready"));
  document.body.classList.add("role-closing");
  window.setTimeout(() => {
    rolePanels.forEach((panel) => panel.classList.remove("is-expanded", "is-detail-ready"));
    document.body.classList.remove("role-focus");
    document.body.classList.remove("role-closing");
  }, ROLE_FADE_MS);
  requestAnimationFrame(positionNovelOrbitCards);
}

function renderRoleRoom() {
  if (!isRoleRoomPage || !roleRoomTarget) return;
  const item = getRoleItem(activeRoleRoom);
  if (!item) return;

  const detail = document.createElement("section");
  const title = document.createElement("div");
  const body = document.createElement("div");
  const detailText = getMetaText(item, "detailTitle", getLocalizedTitle(item));
  const handle = getMetaText(item, "handle", item.meta?.handle || "");

  detail.className = `role-detail role-detail-layout-${item.meta?.layout || "note"} role-room-detail`;

  title.className = "role-section-title";
  title.append(createRoleHeading(detailText, handle, "h2"));
  renderProfileLinks(item, title, detailText);

  body.className = `role-section-body role-section-body-${item.meta?.layout || "note"}`;
  body.dataset.roleBody = activeRoleRoom;
  renderRoleBody(item, body);

  detail.append(title, body);
  roleRoomTarget.replaceChildren(detail);
}

function renderRoleShells() {
  if (isRoleRoomPage) {
    renderRoleRoom();
    return;
  }

  rolePanels.forEach((panel) => {
    const item = getRoleItem(panel.dataset.rolePanel);
    if (!item) return;

    const trigger = document.createElement("button");
    const kicker = document.createElement("span");
    const tagline = document.createElement("em");
    const summary = document.createElement("small");
    const detail = document.createElement("div");
    const close = document.createElement("button");
    const title = document.createElement("div");
    const body = document.createElement("div");
    const titleText = getMetaText(item, "panelTitle", getLocalizedTitle(item));
    const detailText = getMetaText(item, "detailTitle", getLocalizedTitle(item));
    const handle = getMetaText(item, "handle", item.meta?.handle || "");

    trigger.type = "button";
    trigger.className = "role-hit";
    trigger.dataset.roleTrigger = panel.dataset.rolePanel;
    kicker.textContent = item.meta?.kicker || "";
    tagline.textContent = item.meta?.tagline || "";
    summary.textContent = item.meta?.summary || "";
    trigger.append(kicker, createRoleHeading(titleText, handle), tagline, summary);

    detail.className = `role-detail role-detail-layout-${item.meta?.layout || "note"}`;
    detail.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    close.type = "button";
    close.className = "role-close";
    close.dataset.roleClose = "";
    close.setAttribute("aria-label", `Close ${detailText}`);
    close.textContent = "×";
    close.addEventListener("click", (event) => {
      event.stopPropagation();
      closeRolePanels();
    });

    title.className = "role-section-title";
    title.append(createRoleHeading(detailText, handle, "h2"));
    renderProfileLinks(item, title, detailText);

    body.className = `role-section-body role-section-body-${item.meta?.layout || "note"}`;
    body.dataset.roleBody = panel.dataset.rolePanel;
    renderRoleBody(item, body);

    detail.append(close, title, body);
    panel.replaceChildren(trigger, detail);
  });
}

function renderRoleItems() {
  const engineerTarget = document.querySelector("#role-engineer-items");
  const visualTarget = document.querySelector("#role-visual-items");
  const novelOrbitTarget = document.querySelector("#role-novel-orbit-items");
  const novelGridTarget = document.querySelector("#role-novel-grid-items");
  const aestheticsTarget = document.querySelector("#role-aesthetics-items");
  const engineerPaperTarget = document.querySelector("#role-engineer-paper-items");

  if (engineerTarget) {
    engineerTarget.replaceChildren(
      ...topLevelEngineeringItems.map((item) =>
        createRoleItemButton(getLocalizedTitle(item), () => renderMarkdownReader(item.id, true), {
          anchorId: getContentAnchorId(item),
          contentId: item.id,
          kicker: item.meta?.label || "project",
          description: getRecordIntro(getLocalizedMarkdown(item))[0] || getLocalizedMarkdown(item),
        })
      )
    );
  }

  if (engineerPaperTarget) {
    engineerPaperTarget.replaceChildren(
      ...topLevelPaperItems.map((item, index) =>
        createRoleItemButton(getLocalizedTitle(item), () => {
          if (item.meta?.format === "pdf") {
            renderPdfReader(item.id);
          } else {
            renderMarkdownReader(item.id, true);
          }
        }, {
          anchorId: getContentAnchorId(item),
          contentId: item.id,
          kicker: item.meta?.year || "Paper",
          description: getPaperDescription(item),
        })
      )
    );
  }

  if (visualTarget) {
    const galleryProjects = sortGalleryProjects(topLevelGalleryItems);
    renderGalleryProjectMasonry(visualTarget, galleryProjects);
  }

  if (novelOrbitTarget || novelGridTarget) {
    renderNovelStages(novelOrbitTarget, novelGridTarget);
  }

  if (aestheticsTarget) {
    const readingItems = [...topLevelEssayItems].sort((a, b) => {
      const yearA = Number(a.meta?.year || 0);
      const yearB = Number(b.meta?.year || 0);
      if (yearA !== yearB) return yearB - yearA;
      return a.order - b.order;
    });
    aestheticsTarget.replaceChildren(
      ...readingItems.map((item, index) =>
        createRoleItemButton(getLocalizedTitle(item), () => {
          if (item.meta?.format === "pdf") {
            renderPdfReader(item.id);
          } else {
            renderMarkdownReader(item.id, true);
          }
        }, {
          anchorId: getContentAnchorId(item),
          contentId: item.id,
          kicker: item.meta?.year || `Essay ${String(index + 1).padStart(2, "0")}`,
          description: getMetaText(item, "summary", ""),
        })
      )
    );
  }
}

function bindRolePanels() {
  rolePanels.forEach((panel) => {
    let hoverFrame = null;
    panel.addEventListener("pointerenter", () => {
      if (hoverFrame) cancelAnimationFrame(hoverFrame);
      if (!document.body.classList.contains("role-focus")) {
        rolePanels.forEach((item) => item.classList.remove("is-hovered"));
        rolePanels.forEach((item) => item.classList.toggle("is-hovered", item === panel));
      }
    });
    panel.addEventListener("pointerleave", () => {
      hoverFrame = requestAnimationFrame(() => {
        rolePanels.forEach((item) => item.classList.remove("is-hovered"));
        panel.querySelector(".role-hit")?.blur();
        hoverFrame = null;
      });
    });
    panel.addEventListener("click", (event) => {
      if (event.target.closest(".role-detail")) return;
      if (document.body.classList.contains("reader-open") || document.body.classList.contains("pdf-open")) return;
      if (document.body.classList.contains("role-closing")) return;
      if (!isRoleRoomPage) {
        const roomPath = roleRoomPaths[panel.dataset.rolePanel];
        if (roomPath) {
          window.location.href = roomPath;
          return;
        }
      }
      window.clearTimeout(roleReadyTimer);
      rolePanels.forEach((item) => item.classList.remove("is-hovered", "is-detail-ready"));
      document.body.classList.remove("role-closing");
      rolePanels.forEach((item) => item.classList.toggle("is-expanded", item === panel));
      document.body.classList.add("role-focus");
      roleReadyTimer = window.setTimeout(() => {
        if (!panel.classList.contains("is-expanded") || !document.body.classList.contains("role-focus")) return;
        panel.classList.add("is-detail-ready");
        positionNovelOrbitCards();
      }, ROLE_DETAIL_READY_MS);
      requestAnimationFrame(positionNovelOrbitCards);
    });
  });

}
