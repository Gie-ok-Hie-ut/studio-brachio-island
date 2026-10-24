/* Responsive derivatives are only used for lists; detail views keep original files. */
function setListImageSource(image, asset, sizes) {
  const original = projectHref(asset);
  const projectUrl = new URL(projectRoot || "./", document.baseURI);
  const assetUrl = new URL(original, document.baseURI);
  const key = assetUrl.origin === projectUrl.origin && assetUrl.pathname.startsWith(projectUrl.pathname)
    ? decodeURIComponent(assetUrl.pathname.slice(projectUrl.pathname.length))
    : "";
  const preview = window.IMAGE_PREVIEWS?.images?.[key];

  image.loading = "lazy";
  image.decoding = "async";
  if (!preview?.variants?.length) {
    image.src = original;
    return;
  }

  image.width = preview.width;
  image.height = preview.height;
  image.sizes = sizes;
  image.srcset = preview.variants
    .map((variant) => `${projectHref(variant.src)} ${variant.width}w`)
    .join(", ");
  image.src = projectHref((preview.variants.find((variant) => variant.width >= 640) || preview.variants.at(-1)).src);
  image.addEventListener("error", () => {
    image.removeAttribute("srcset");
    image.removeAttribute("sizes");
    image.src = original;
  }, { once: true });
}
