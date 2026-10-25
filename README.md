# Studio Brachio Island

Static homepage for Studio Brachio Island.

## Editing Content

Markdown files in `content/` are the source of truth. Do not edit
`content-index.js` by hand.

After changing markdown or adding project assets, regenerate the content index:

```sh
npm run build:content
```

After changing shared page chrome, modal markup, CSS, JavaScript, or the
content index, regenerate the active HTML pages:

```sh
npm run build:pages
```

CSS, JavaScript, and content-index cache query strings are generated from file
content hashes. Do not bump cache versions by hand.

Active CSS and JavaScript source lives in `versions/src/` and is bundled into
`versions/version-15.css` and `versions/version-15.js`. The root `styles.css`
and `script.js` files are not used by the current generated pages.

### Font loading

The site uses the unmodified official Pretendard v1.3.9 variable dynamic subsets,
served locally from `assets/fonts/subsets/`. The preserved original font matches
that release byte for byte. `unicode-range` lets the browser request the pieces
used by the page instead of downloading the entire 2.06 MB font on every cold
visit. Only the 37,996-byte basic Latin subset is preloaded. The CSS family,
weight range, glyph shapes, and layout remain the same.

The official subsets cover 12,029 of the original 14,336 supported characters.
The remaining 2,307 characters retain a separate, non-overlapping Unicode range
pointing to the original font. Future content using those less common characters
can still display in the same font, but will download the original file when
needed. The original font and its OFL license must remain in the repository.

`npm run build:fonts` generates `versions/src/css/00-fonts.css` from the verified
manifest. `npm run check:fonts` checks file hashes, character coverage, variable
axes, and generated CSS using only Node's built-in modules. Both commands are
included in the complete build/check. Commit the manifest, official subset
files, upstream CSS, and generated CSS together.

For an optional deep audit, install `fonttools[woff]==4.60.2` in a Python virtual
environment and run `python scripts/build-fonts.py --check`. This compares every
subset character's outlines, horizontal metrics, and variable-font deltas with
the original. `python scripts/build-fonts.py --download` restores pinned official
files and regenerates the manifest/CSS. Ordinary builds do not require Python,
fontTools, or a network connection.

The first-paint guard now waits for the actual localized DOM and an initial
chapter opened by URL, then explicitly loads those characters and waits for a
fresh `document.fonts.ready`. Closed readers are populated when opened. The
previous 8-second failure/fallback behavior is retained pending a separate
product decision; this optimization does not adopt a new failure policy.
Language changes keep the current text visible while loading the target
language's subsets for the current page and open reader, then update the text
and language state together. The latest selection wins if requests overlap.

### Image previews

Install the pinned image-build dependency with `npm ci` (Node.js 20.9 or newer).
After changing gallery images or top-level novel covers, run:

```sh
npm run build:images
npm run build:pages
```

`npm run build` performs both steps and refreshes the content index first.
The image builder reads gallery `image` / `assets` and top-level novel covers
from the generated content index. It writes list-only WebP derivatives to
`assets/previews/` and their dimensions, hashes, and source mapping to
`image-previews.js`. Commit both generated outputs with the source changes.
The original files under `content/` remain unchanged and are still used for
full-image viewing. Videos, remote images, and unsupported formats retain their
existing behavior.

Previews preserve the full composition, aspect ratio, transparency, embedded ICC
profile, and EXIF display orientation. Widths are 160, 320, 640, 960, and 1280 px;
smaller originals stop at their native width and are never enlarged. WebP uses
quality 90, alpha quality 100, and effort 6. These are visually compressed list
images; they are not replacements for the original artwork files.

`npm run check:images` verifies source and output SHA-256 hashes, build settings,
file presence, WebP dimensions, and ICC profiles using Node's built-in modules
only. It also reports stale manifests or unused generated files. `npm run build:images`
reuses valid previews, regenerates changed or missing ones, and removes unused
generated previews without modifying originals.

Before committing, run:

```sh
npm run check
```

This verifies that `content-index.js` matches the markdown source, referenced
content assets exist, active HTML pages match the shared page template, active
asset partials are listed in the bundle, and the active JavaScript files parse
correctly.

## GitHub Pages

Use the repository root as the Pages source.

1. Push this folder to GitHub.
2. In the repository, open `Settings > Pages`.
3. Set `Source` to `Deploy from a branch`.
4. Select the `main` branch and `/ (root)`.
5. Open the published GitHub Pages URL.

The root `index.html` is the public entry page. Public room pages are generated
at the repository root:

```txt
who-are-we.html
ai-research.html
novel.html
visual-art.html
essay.html
```

Supporting CSS and JavaScript live under `versions/`. Legacy
`versions/rooms-v15/*.html` URLs are generated as redirects to the root public
pages.
