function clamp(value, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

function updateIntroScroll() {
  updateHomeScrollMotion();
  if (!introScreen) {
    document.documentElement.style.setProperty("--intro-title-opacity", "0");
    document.documentElement.style.setProperty("--header-opacity", "1");
    document.documentElement.style.setProperty("--role-page-opacity", "1");
    document.body.classList.add("is-header-visible");
    return;
  }
  const introHeight = Math.max(introScreen.offsetHeight, window.innerHeight);
  const progress = clamp(window.scrollY / introHeight);
  const titleOpacity = 1 - clamp((progress - 0.08) / 0.42);
  const headerOpacity = clamp((progress - 0.42) / 0.34);
  const rolePageOpacity = clamp((progress - 0.36) / 0.46);

  document.documentElement.style.setProperty("--intro-title-opacity", titleOpacity.toFixed(3));
  document.documentElement.style.setProperty("--header-opacity", headerOpacity.toFixed(3));
  document.documentElement.style.setProperty("--role-page-opacity", rolePageOpacity.toFixed(3));
  document.body.classList.toggle("is-header-visible", headerOpacity > 0.08);
}

function updateHomeScrollMotion() {
  if (!homeLandingTitle && !todaysSignalTarget) return;
  const viewportHeight = Math.max(window.innerHeight, 1);
  const landingHeight = homeLanding ? Math.max(homeLanding.offsetHeight, viewportHeight) : viewportHeight;
  const scrollY = Math.max(window.scrollY, 0);
  const titleProgress = clamp(scrollY / (landingHeight * 0.72));
  const titleOpacity = 1 - clamp((titleProgress - 0.05) / 0.7);
  const titleShift = -18 * clamp(titleProgress / 0.8);

  if (homeLandingTitle) {
    const titleShiftAbs = Math.abs(titleShift);
    homeLandingTitle.style.opacity = titleOpacity.toFixed(3);
    homeLandingTitle.style.transform = `translateY(calc(-50% - ${titleShiftAbs.toFixed(1)}px))`;
  }

  if (homeScrollHint) {
    const hintOpacity = 1 - clamp(scrollY / (landingHeight * 0.28));
    homeScrollHint.style.opacity = hintOpacity.toFixed(3);
    homeScrollHint.style.pointerEvents = hintOpacity > 0.08 ? "" : "none";
  }

  const signalCard = todaysSignalTarget?.querySelector(".todays-signal-card");
  if (!signalCard || !todaysSignalTarget) return;
  const signalRect = todaysSignalTarget.getBoundingClientRect();
  const signalProgress = clamp((viewportHeight - signalRect.top) / (viewportHeight * 0.72));
  const signalOpacity = clamp((signalProgress - 0.08) / 0.62);
  const signalShift = (1 - signalOpacity) * 20;
  signalCard.style.opacity = signalOpacity.toFixed(3);
  signalCard.style.transform = `translateY(${signalShift.toFixed(1)}px)`;
}

function restoreExploreHash() {
  if (isRoleRoomPage || window.location.hash !== "#explore") return;
  const explore = document.querySelector("#explore");
  if (!explore) return;
  requestAnimationFrame(() => {
    explore.scrollIntoView({ block: "start" });
    updateIntroScroll();
  });
}

function setV15MenuState(isOpen) {
  if (!v15MenuToggle || !v15RoleMenu) return;
  document.body.classList.toggle("is-v15-menu-open", isOpen);
  v15MenuToggle.setAttribute("aria-expanded", String(isOpen));
}

function bindV15Menu() {
  if (!v15MenuToggle || !v15RoleMenu) return;
  v15MenuToggle.addEventListener("click", () => {
    setV15MenuState(!document.body.classList.contains("is-v15-menu-open"));
  });
  v15RoleMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (/^(mailto:|tel:)/i.test(link.getAttribute("href") || "")) return;
      event.preventDefault();
      document.body.classList.add("is-v15-leaving");
      window.setTimeout(() => {
        window.location.href = link.href;
      }, 240);
    });
  });
}

function projectHref(path = "") {
