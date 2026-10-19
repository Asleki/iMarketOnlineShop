// Shared metadata utility for future shop and product routes.
// Do not fabricate canonical URLs, prices, reviews, ratings, or availability.
function upsertMeta(kind, key, content) {
  if (typeof content !== "string") return;
  let node = document.head.querySelector('meta[' + kind + '="' + key + '"]');
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute(kind, key);
    document.head.append(node);
  }
  node.setAttribute("content", content);
}
export function setPageMetadata({ title, description, canonicalUrl = null, robots = "noindex, nofollow" }) {
  if (!title || !description) throw new TypeError("Page title and description are required");
  document.title = title;
  upsertMeta("name", "description", description);
  upsertMeta("name", "robots", robots);
  upsertMeta("property", "og:title", title);
  upsertMeta("property", "og:description", description);
  upsertMeta("name", "twitter:title", title);
  upsertMeta("name", "twitter:description", description);
  const existingCanonical = document.head.querySelector('link[rel="canonical"]');
  if (canonicalUrl) {
    const url = new URL(canonicalUrl);
    if (url.protocol !== "https:") throw new TypeError("Canonical URL must be HTTPS");
    const link = existingCanonical || document.createElement("link");
    link.rel = "canonical";
    link.href = url.href;
    if (!existingCanonical) document.head.append(link);
    upsertMeta("property", "og:url", url.href);
  } else {
    existingCanonical?.remove();
    document.head.querySelector('meta[property="og:url"]')?.remove();
  }
}
