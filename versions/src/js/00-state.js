const readerTitle = document.querySelector("#reader-title");
const readerSource = document.querySelector("#reader-source");
const readerContent = document.querySelector("#reader-content");
const readerModal = document.querySelector("#reader-modal");
const readerWindow = document.querySelector(".popup-window-reader");
const readerScrollIndicator = document.querySelector("[data-reader-scroll-indicator]");
const readerScrollThumb = document.querySelector("[data-reader-scroll-thumb]");
const pdfModal = document.querySelector("#pdf-modal");
const pdfTitle = document.querySelector("#pdf-title");
const pdfSource = document.querySelector("#pdf-source");
const pdfFrame = document.querySelector("#pdf-frame");
const readerLang = document.querySelector("#reader-lang");
const readerSize = document.querySelector("#reader-size");
const readerSpacing = document.querySelector("#reader-spacing");
const readerBackControl = document.querySelector("[data-reader-back]");
const closeReaderControls = document.querySelectorAll("[data-close-reader]");
const closePdfControls = document.querySelectorAll("[data-close-pdf]");
const sharePopupControls = document.querySelectorAll("[data-share-popup]");
const v15MenuToggle = document.querySelector("[data-v15-menu-toggle]");
const v15RoleMenu = document.querySelector("#v15-role-menu");
const todaysSignalTarget = document.querySelector("[data-todays-signal]");
const homeLanding = document.querySelector(".v15-landing");
const homeLandingTitle = document.querySelector(".v15-landing-title");
const homeScrollHint = document.querySelector(".v15-scroll-hint");
const ROLE_FADE_MS = 760;
const ROLE_DETAIL_READY_MS = 360;
const introScreen = document.querySelector(".intro-screen");
const rolePanels = document.querySelectorAll("[data-role-panel]");
const activeRoleRoom = document.body.dataset.roleRoom || "";
const roleRoomTarget = document.querySelector("[data-role-room-target]");
const isRoleRoomPage = Boolean(activeRoleRoom);
const isLegacyRoleRoomPage = isRoleRoomPage && /\/versions\/rooms-v15\/[^/]+\.html$/i.test(window.location.pathname);
const isArchivedVersionPage = !isRoleRoomPage && /\/versions\/[^/]+\.html$/i.test(window.location.pathname);
const projectRoot = isLegacyRoleRoomPage ? "../../" : isArchivedVersionPage ? "../" : "";
const roleRoomRoot = isArchivedVersionPage ? "rooms-v15/" : "";
const roleRoomPaths = {
  identity: `${roleRoomRoot}who-are-we.html`,
  engineer: `${roleRoomRoot}ai-research.html`,
  novel: `${roleRoomRoot}novel.html`,
  visual: `${roleRoomRoot}visual-art.html`,
  aesthetics: `${roleRoomRoot}essay.html`,
};
const languageControls = document.querySelectorAll("[data-language]");
const contentItems = window.CONTENT_INDEX?.items || [];
const novelItems = contentItems.filter((item) => item.type === "novel");
const galleryItems = contentItems.filter((item) => item.type === "gallery");
const essayItems = contentItems.filter((item) => item.type === "essay");
const roleItems = contentItems.filter((item) => item.type === "role");
const topLevelNovelItems = novelItems.filter((item) => item.topLevel !== false);
const topLevelGalleryItems = galleryItems.filter((item) => item.topLevel !== false);
const topLevelEssayItems = essayItems.filter((item) => item.topLevel !== false);
const NOVEL_DEFAULT_VELOCITY = -0.14;
const NOVEL_HOVER_VELOCITY = Math.abs(NOVEL_DEFAULT_VELOCITY) * 8;
const NOVEL_SLOW_VELOCITY = -0.035;
const NOVEL_VELOCITY_EASE_MS = 1100;
const novelView = {
  mode: window.matchMedia("(max-width: 900px)").matches ? "grid" : "orbit",
};
const novelOrbit = {
  angle: 0,
  defaultVelocity: NOVEL_DEFAULT_VELOCITY,
  targetVelocity: NOVEL_DEFAULT_VELOCITY,
  velocity: NOVEL_DEFAULT_VELOCITY,
  frame: null,
  lastTime: 0,
  bound: false,
};
let readerScrollIndicatorFrame = null;
