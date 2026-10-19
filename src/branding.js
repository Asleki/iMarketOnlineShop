import { setPageMetadata } from './seo.js';

const root = new URL('../', import.meta.url);
const assetUrl = path => new URL(path, root).href;

// Separate wordmarks let layouts show a symbol, a name, or both.
export function createShopWordmark(shop) {
  const wrapper = document.createElement('span');
  wrapper.className = 'shop-wordmark';
  for (const [mode, path] of [['light', shop.brandAssets.wordmarkLight], ['dark', shop.brandAssets.wordmarkDark]]) {
    const img = document.createElement('img');
    img.className = 'wordmark-' + mode;
    img.src = assetUrl(path);
    // One accessible name on the wrapper works regardless of visible theme.
    img.alt = '';
    img.decoding = 'async';
    wrapper.append(img);
  }
  wrapper.setAttribute('role', 'img');
  wrapper.setAttribute('aria-label', shop.name);
  return wrapper;
}

// Future shop routes call this on every route transition, including back/forward.
// Production canonical/social URLs must be supplied by verified route metadata.
export function applyShopBranding(shop, { canonicalUrl = null } = {}) {
  setPageMetadata({ title: shop.name + ' | onStore', description: shop.description, canonicalUrl });
  document.head.querySelectorAll('link[rel="shortcut icon"]').forEach(link => link.remove());
  for (const [rel, path, type] of [
    ['icon', shop.brandAssets.favicon, 'image/x-icon'],
    ['apple-touch-icon', shop.brandAssets.appleTouchIcon, 'image/png']
  ]) {
    document.head.querySelectorAll('link[rel="' + rel + '"]').forEach(link => link.remove());
    const link = document.createElement('link');
    link.rel = rel; link.type = type; link.href = assetUrl(path);
    document.head.append(link);
  }
  // Clear stale shop images before replacing them or returning to staging.
  for (const selector of ['meta[property="og:image"]', 'meta[name="twitter:image"]']) {
    document.head.querySelectorAll(selector).forEach(node => node.remove());
  }
  if (canonicalUrl) {
    const imageUrl = new URL(shop.brandAssets.social, root);
    for (const [attribute, key] of [['property', 'og:image'], ['name', 'twitter:image']]) {
      const meta = document.createElement('meta');
      meta.setAttribute(attribute, key); meta.content = imageUrl.href;
      document.head.append(meta);
    }
  }
}
