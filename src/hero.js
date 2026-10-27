// onStore Stage 3 hero v2: catalogue-led, not a hardcoded product or shop list.
// Images are drawn from verified onStore media records and fill the full hero.
import { createIcon } from './icons.js';
import { setProductImage } from './media.js';

const ROOT = new URL('../', import.meta.url);
const ROTATE_MS = 7000;
const MAX_SLIDES = 5; // onstore.stage3.hero.fixed-five.loop.v3
const validMedia = path => typeof path === 'string' && /^media\/images\/[a-zA-Z0-9_-]+\.webp$/.test(path);
const el = (tag, cls = '', text = undefined) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
};
const shuffle = (items, random) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// Pure selector: no chosen product names, IDs, shop names or shop slugs.
// Prefer one product per shop, and avoid products shown in the previous round.
export function selectHeroSlides(products, limit = MAX_SLIDES, previouslyShown = [], random = Math.random) {
  if (!Array.isArray(products) || !Number.isInteger(limit) || limit < 1) return [];
  const previous = new Set(previouslyShown.map(p => p.main_image));
  const qualified = products.filter(p =>
    p && typeof p.canonical_name === 'string' && p.canonical_name.trim() &&
    typeof p.shop_slug === 'string' && typeof p.description === 'string' &&
    validMedia(p.main_image) && Array.isArray(p.media) &&
    p.media.some(m => m && m.path === p.main_image)
  );
  const groups = new Map();
  for (const product of qualified) {
    if (!groups.has(product.shop_slug)) groups.set(product.shop_slug, []);
    groups.get(product.shop_slug).push(product);
  }
  const chosen = [];
  for (const shop of shuffle([...groups.keys()], random)) {
    const candidates = groups.get(shop);
    const fresh = candidates.filter(p => !previous.has(p.main_image));
    const group = shuffle(fresh.length ? fresh : candidates, random);
    if (group.length) chosen.push(group[0]);
    if (chosen.length >= limit) return chosen;
  }
  // If there are fewer shops than slides, fill using other qualified images.
  const used = new Set(chosen.map(p => p.main_image));
  const extra = shuffle(qualified.filter(p => !used.has(p.main_image) && !previous.has(p.main_image)), random);
  for (const product of extra) {
    chosen.push(product);
    if (chosen.length >= limit) break;
  }
  return chosen;
}

export async function initHero() {
  const host = document.querySelector('#hero-slider');
  if (!host) throw new Error('Hero container missing');
  const response = await fetch(new URL('../api/v1/catalogue.json', import.meta.url));
  if (!response.ok) throw new Error('Hero catalogue request failed: ' + response.status);
  const data = await response.json();
  if (!Array.isArray(data.products)) throw new Error('Invalid hero catalogue');
  const slides = selectHeroSlides(data.products);
  if (!slides.length) throw new Error('Hero catalogue has no image-qualified products');

  // Image directly fills the slider, not an inset product-image card.
  const photo = el('img', 'featured-photo');
  photo.decoding = 'async';
  photo.fetchPriority = 'high';
  photo.loading = 'eager';
  photo.setAttribute('draggable', 'false');
  const shade = el('div', 'featured-overlay');
  shade.setAttribute('aria-hidden', 'true');
  const layout = el('div', 'featured-content shell');
  const copy = el('div', 'featured-copy');
  const eyebrow = el('p', 'eyebrow');
  const title = el('h1', 'featured-title');
  const caption = el('p', 'featured-caption');
  const detail = el('a', 'button button-primary featured-cta', 'View product details');
  detail.href = '#catalogue';
  copy.append(eyebrow, title, caption, detail);
  layout.append(copy);

  const controls = el('div', 'featured-controls shell');
  const previousButton = el('button', 'featured-arrow');
  previousButton.type = 'button';
  previousButton.setAttribute('aria-label', 'Previous featured product');
  previousButton.append(createIcon('chevron-left'));
  const dots = el('div', 'featured-dots');
  dots.setAttribute('role', 'group');
  dots.setAttribute('aria-label', 'Featured slides');
  const nextButton = el('button', 'featured-arrow');
  nextButton.type = 'button';
  nextButton.setAttribute('aria-label', 'Next featured product');
  nextButton.append(createIcon('chevron-right'));
  controls.append(previousButton, dots, nextButton);
  host.setAttribute('aria-live', 'off'); // Avoid announcing every automatic transition.
  host.replaceChildren(photo, shade, layout, controls);

  let position = 0;
  let timer = null;
  let catalogueReady = document.documentElement.dataset.onstoreCatalogueReady === 'true';
  document.addEventListener('onstore:catalogue-ready', () => { catalogueReady = true; });
  const dotButtons = slides.map((_, i) => {
    const dot = el('button', 'featured-dot');
    dot.type = 'button';
    dot.setAttribute('aria-label', 'Show featured slide ' + (i + 1));
    dot.addEventListener('click', () => { show(i); restart(); });
    dots.append(dot);
    return dot;
  });

  function show(i) {
    position = (i + slides.length) % slides.length;
    const product = slides[position];
    title.textContent = product.canonical_name;
    eyebrow.textContent = product.shop || 'Featured product';
    caption.textContent = product.description;
    setProductImage(photo, new URL(product.main_image, ROOT).href, product.canonical_name);
    photo.loading = 'eager'; // Hero images must not be postponed by the catalogue lazy-image helper.
    detail.setAttribute('aria-label', 'View details for ' + product.canonical_name);
    dotButtons.forEach((dot, d) => {
      dot.setAttribute('aria-current', String(d === position));
      dot.setAttribute('aria-pressed', String(d === position));
    });
  }
  function advance() {
    // Exactly five selected products for this page load. Wrap 5 -> 1.
    show(position + 1);
  }
  function shouldPause() {
    // Pause only while the browser tab is hidden. In particular, touching a
    // button, mouse hover, or keyboard focus must not disable auto-advance.
    // CSS honors prefers-reduced-motion by disabling visual motion effects,
    // while the explicitly requested seven-second slide changes continue.
    return document.hidden;
  }
  function restart() {
    if (timer !== null) clearInterval(timer);
    timer = window.setInterval(() => { if (!shouldPause()) advance(); }, ROTATE_MS);
  }
  detail.addEventListener('click', event => {
    if (!catalogueReady) return;
    event.preventDefault();
    const product = slides[position];
    document.dispatchEvent(new CustomEvent('onstore:open-product', {
      detail: { name: product.canonical_name, shop: product.shop_slug }
    }));
  });
  previousButton.addEventListener('click', () => { show(position - 1); restart(); });
  nextButton.addEventListener('click', () => { advance(); restart(); });
  host.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); show(position - 1); restart(); }
    if (event.key === 'ArrowRight') { event.preventDefault(); advance(); restart(); }
  });
  window.addEventListener('pagehide', () => { if (timer !== null) clearInterval(timer); }, { once: true });
  show(0);
  restart();
}
