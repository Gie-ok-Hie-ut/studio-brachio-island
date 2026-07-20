const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const publicBaseUrl = "https://gie-ok-hie-ut.github.io/studio-brachio-island";
const siteName = "Studio Brachio Island";
const description = "Studio Brachio Island gathers AI research, fiction, visual art, essays, and identity into one studio archive.";
const shareImageUrl = `${publicBaseUrl}/assets/share-thumbnail.png`;

function readAnalyticsConfig() {
  const configPath = path.join(root, "analytics.config.json");
  if (!fs.existsSync(configPath)) return null;

  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  if (!config.enabled) return null;
  if (config.provider !== "umami") return null;
  if (!config.websiteId || !config.scriptUrl) return null;

  return config;
}

function analyticsScript() {
  const config = readAnalyticsConfig();
  if (!config) return "";

  return `    <script defer src="${config.scriptUrl}" data-website-id="${config.websiteId}"></script>\n`;
}

function fileVersion(relativePath) {
  const buffer = fs.readFileSync(path.join(root, relativePath));
  return crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 10);
}

const versions = {
  css: fileVersion("versions/version-15.css"),
  content: fileVersion("content-index.js"),
  js: fileVersion("versions/version-15.js"),
};

const navItems = [
  { label: "HOME", hover: "HOME", homeHref: "./", roomHref: "../../" },
  { label: "WHO WE ARE", hover: "@STUDIO BRACHIO ISLAND", homeHref: "versions/rooms-v15/who-are-we.html", roomHref: "who-are-we.html" },
  { label: "AI RESEARCH", hover: "@LEE GUNHEE", homeHref: "versions/rooms-v15/ai-research.html", roomHref: "ai-research.html" },
  { label: "NOVEL", hover: "@ILLI", homeHref: "versions/rooms-v15/novel.html", roomHref: "novel.html" },
  { label: "VISUAL ART", hover: "@NEOHEE", homeHref: "versions/rooms-v15/visual-art.html", roomHref: "visual-art.html" },
  { label: "ESSAY", hover: "@ALL", homeHref: "versions/rooms-v15/essay.html", roomHref: "essay.html" },
  { label: "CONTACT", hover: "EMAIL", homeHref: "mailto:ivagasm@naver.com", roomHref: "mailto:ivagasm@naver.com", ariaLabel: "Contact by email" },
];

const rooms = [
  { output: "versions/rooms-v15/who-are-we.html", title: "Who We Are", role: "identity" },
  { output: "versions/rooms-v15/ai-research.html", title: "AI Research", role: "engineer" },
  { output: "versions/rooms-v15/novel.html", title: "Novel", role: "novel" },
  { output: "versions/rooms-v15/visual-art.html", title: "Visual Art", role: "visual" },
  { output: "versions/rooms-v15/essay.html", title: "Essay", role: "aesthetics" },
];

function attr(name, value) {
  if (!value) return "";
  return ` ${name}="${value}"`;
}

function nav(context) {
  const isHome = context === "home";
  const links = navItems
    .map((item) => {
      const href = isHome ? item.homeHref : item.roomHref;
      return `<a href="${href}" data-menu-hover="${item.hover}"${attr("aria-label", item.ariaLabel)}>${item.label}</a>`;
    })
    .join("\n          ");

  return `<nav id="v15-role-menu" class="v15-role-menu" aria-label="Studio roles">
          ${links}
          <div class="v15-menu-language language-switch" aria-label="Language">
            <button type="button" data-language="en">EN</button>
            <span>/</span>
            <button type="button" data-language="ko">KO</button>
          </div>
        </nav>`;
}

function menuToggle(indent = "      ") {
  return `${indent}<button
${indent}  class="v15-menu-toggle"
${indent}  type="button"
${indent}  aria-label="Open menu"
${indent}  aria-expanded="false"
${indent}  aria-controls="v15-role-menu"
${indent}  data-v15-menu-toggle
${indent}>
${indent}  <span class="v15-menu-icon" aria-hidden="true">
${indent}    <span></span>
${indent}    <span></span>
${indent}    <span></span>
${indent}  </span>
${indent}</button>`;
}

function head({ title, urlPath, cssHref, includeCanonical = false }) {
  const fullTitle = title === siteName ? siteName : `${title} - ${siteName}`;
  const url = urlPath ? `${publicBaseUrl}/${urlPath}` : `${publicBaseUrl}/`;

  return `  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <title>${fullTitle}</title>
    <meta property="og:site_name" content="${siteName}">
    <meta property="og:title" content="${fullTitle}">
    <meta property="og:description" content="${description}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${shareImageUrl}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${fullTitle}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${shareImageUrl}">
    <meta name="description" content="${description}">
${includeCanonical ? '    <link rel="canonical" href="./">\n' : ""}    <link rel="stylesheet" href="${cssHref}?v=${versions.css}">
${analyticsScript().trimEnd()}
  </head>`;
}

function readerModal(defaultBody = "") {
  return `    <div id="reader-modal" class="reader-modal" aria-hidden="true">
      <div class="reader-backdrop" data-close-reader></div>
      <section class="reader-window" role="dialog" aria-modal="true" aria-labelledby="reader-title">
        <div class="reader-toolbar">
          <div>
            <p class="reader-kicker">Read</p>
            <h2 id="reader-title">Select a text</h2>
          </div>
          <div class="reader-actions">
            <label>
              lang
              <select id="reader-lang" aria-label="Language">
                <option value="en" selected>en</option>
                <option value="ko">ko</option>
              </select>
            </label>
            <label>
              size
              <select id="reader-size" aria-label="Text size">
                <option value="small">small</option>
                <option value="medium" selected>medium</option>
                <option value="large">large</option>
              </select>
            </label>
            <label>
              spacing
              <select id="reader-spacing" aria-label="Line spacing">
                <option value="tight">tight</option>
                <option value="normal" selected>normal</option>
                <option value="wide">wide</option>
              </select>
            </label>
            <a id="reader-source" class="modal-source" href="#" hidden></a>
            <button class="modal-share" type="button" data-share-popup aria-label="Share this popup">
              <span class="modal-share-label">SHARE</span>
              <span class="modal-share-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M12 15V3"></path><path d="M7.5 7.5 12 3l4.5 4.5"></path><path d="M6 11v8h12v-8"></path></svg></span>
              <span class="modal-share-status" aria-hidden="true">COPIED</span>
            </button>
            <button class="modal-back" type="button" data-reader-back aria-label="Back" disabled>←</button>
            <button class="modal-close" type="button" data-close-reader aria-label="Close reader">×</button>
          </div>
        </div>
        <article id="reader-content" class="reader-content">${defaultBody}</article>
        <div class="reader-scroll-indicator" data-reader-scroll-indicator aria-hidden="true">
          <span data-reader-scroll-thumb></span>
        </div>
      </section>
    </div>`;
}

function pdfModal() {
  return `    <div id="pdf-modal" class="pdf-modal" aria-hidden="true">
      <div class="pdf-backdrop" data-close-pdf></div>
      <section class="pdf-window" role="dialog" aria-modal="true" aria-labelledby="pdf-title">
        <div class="pdf-toolbar">
          <div>
            <p class="reader-kicker">PDF</p>
            <h2 id="pdf-title">Select a PDF</h2>
          </div>
          <div class="reader-actions">
            <a id="pdf-source" class="modal-source" href="#" hidden></a>
            <button class="modal-share" type="button" data-share-popup aria-label="Share this popup">
              <span class="modal-share-label">SHARE</span>
              <span class="modal-share-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M12 15V3"></path><path d="M7.5 7.5 12 3l4.5 4.5"></path><path d="M6 11v8h12v-8"></path></svg></span>
              <span class="modal-share-status" aria-hidden="true">COPIED</span>
            </button>
            <button class="modal-close" type="button" data-close-pdf aria-label="Close PDF">×</button>
          </div>
        </div>
        <iframe id="pdf-frame" class="pdf-frame" title="PDF viewer"></iframe>
      </section>
    </div>`;
}

function scripts({ writingData, contentIndex, app }) {
  return `    <script src="${writingData}"></script>
    <script src="${contentIndex}?v=${versions.content}"></script>
    <script src="${app}?v=${versions.js}"></script>`;
}

function homePage() {
  return `<!doctype html>
<!-- Generated by scripts/build-pages.js. Do not edit active page chrome by hand. -->
<html lang="en">
${head({ title: siteName, urlPath: "", cssHref: "versions/version-15.css", includeCanonical: true })}
  <body class="v15-home">
    <main class="v15-home-main" aria-label="${siteName}">
      <section class="v15-landing" aria-label="${siteName}">
        <div class="v15-landing-title" aria-label="${siteName}">
          <h1>
            <span>STUDIO</span>
            <span class="v15-landing-title-invert">BRACHIO</span>
            <span class="v15-landing-title-invert">ISLAND</span>
          </h1>
        </div>
        <a class="v15-scroll-hint" href="#todays-signal" aria-label="Go to today's signal">TODAY'S SIGNAL ↓</a>

${menuToggle("        ")}

        ${nav("home")}
      </section>
      <section id="todays-signal" class="todays-signal" data-todays-signal aria-label="Today's Signal">
        <p class="todays-signal-placeholder">Tuning today's signal...</p>
      </section>
    </main>

${readerModal("\n          <p>writing 섹션에서 제목을 클릭하면 이곳에 본문이 렌더링됩니다.</p>\n        ")}

${pdfModal()}

${scripts({ writingData: "versions/writing-data.js", contentIndex: "content-index.js", app: "versions/version-15.js" })}
  </body>
</html>
`;
}

function roomPage(room) {
  return `<!doctype html>
<!-- Generated by scripts/build-pages.js. Do not edit active page chrome by hand. -->
<html lang="en">
${head({ title: room.title, urlPath: room.output, cssHref: "../version-15.css" })}
  <body data-role-room="${room.role}">
    <header class="v15-topbar">
${menuToggle("      ")}
      ${nav("room")}
    </header>
    <main class="role-room-main">
      <section data-role-room-target></section>
    </main>
${readerModal("")}
${pdfModal()}
${scripts({ writingData: "../writing-data.js", contentIndex: "../../content-index.js", app: "../version-15.js" })}
  </body>
</html>
`;
}

const pages = [
  { output: "index.html", html: homePage() },
  ...rooms.map((room) => ({ output: room.output, html: roomPage(room) })),
];

function writeOrCheck() {
  const check = process.argv.includes("--check");
  let failed = false;

  pages.forEach((page) => {
    const outputPath = path.join(root, page.output);
    if (check) {
      const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
      if (current !== page.html) {
        console.error(`${page.output} is out of date. Run: npm run build:pages`);
        failed = true;
      }
      return;
    }

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, page.html, "utf8");
    console.log(`Generated ${page.output}`);
  });

  if (failed) process.exit(1);
  if (check) console.log("Active HTML pages are up to date.");
}

writeOrCheck();
