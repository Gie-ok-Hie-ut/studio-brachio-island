/* Reader settings and shared mutable popup state. */
const defaultReaderSettings = {
  lang: "en",
  size: "medium",
  spacing: "normal",
};
function getSavedReaderSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("readerSettings") || "{}");
    const settings = {};
    ["lang", "size", "spacing"].forEach((key) => {
      if (saved[key]) settings[key] = saved[key];
    });
    if (!localStorage.getItem("siteLanguage")) {
      delete settings.lang;
    }
    return settings;
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
let activeReaderLanguage = "";
let currentReader = {
  type: "",
  id: "",
};
let readerHistory = [];
let currentGalleryProject = {
  item: null,
  index: 0,
};
let galleryOriginalModal = null;
let galleryOriginalMedia = null;
let roleReadyTimer = 0;
let galleryMasonryColumnCount = 0;
let isApplyingPopupHash = false;
