// Central image fallback helper. The real media URL will come from a verified
// NoveGeo product-media manifest, keyed by canonical product ID.
export const FALLBACK_IMAGE_URL = new URL("../images/placeholder.webp", import.meta.url).href;
export function setProductImage(img, mediaUrl, altText) {
  if (!(img instanceof HTMLImageElement)) throw new TypeError("Expected an image element");
  img.alt = altText || "Product image";
  img.loading = "lazy";
  img.decoding = "async";
  let usingFallback = !mediaUrl || typeof mediaUrl !== "string";
  img.onerror = () => {
    if (usingFallback) { img.onerror = null; return; }
    usingFallback = true;
    img.src = FALLBACK_IMAGE_URL;
  };
  img.src = usingFallback ? FALLBACK_IMAGE_URL : mediaUrl;
}
