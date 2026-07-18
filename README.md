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

Before committing, run:

```sh
npm run check
```

This verifies that `content-index.js` matches the markdown source, referenced
content assets exist, active HTML pages match the shared page template, and the
active JavaScript files parse correctly.

## GitHub Pages

Use the repository root as the Pages source.

1. Push this folder to GitHub.
2. In the repository, open `Settings > Pages`.
3. Set `Source` to `Deploy from a branch`.
4. Select the `main` branch and `/ (root)`.
5. Open the published GitHub Pages URL.

The root `index.html` is the public entry page. Supporting CSS, JavaScript, and room pages live under `versions/`.
