import { initPromoData, createPromotionPriceNode, showDemoCampaignStrip } from './commerce-promotions.js';
import { createPriceNode, reloadPricing } from './commerce-prices.js';
// onStore Stage 2: data-driven catalogue. No live prices or invented inventory.
import { setProductImage } from './media.js';
const ROOT = new URL('../', import.meta.url);
const API = new URL('../api/v1/catalogue.json', import.meta.url);
const BATCH = 24;

const el = (tag, className = '', text = null) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null) node.textContent = text;
  return node;
};
const imageUrl = path => {
  if (typeof path !== 'string' || !/^media\/images\/[a-zA-Z0-9_-]+\.webp$/.test(path)) {
    return null;
  }
  return new URL(path, ROOT).href;
};

function verifyCatalogue(data, shops) {
  if (data?.schema !== 'onstore.catalogue.v1' || !Array.isArray(data.products) || data.products.length !== 210) {
    throw new Error('Unexpected catalogue schema or product count');
  }
  if (shops.length !== 7 || data.shops?.length !== 7) throw new Error('Seven shops are required');
  const ids = new Set();
  for (const shop of shops) {
    if (data.products.filter(p => p.shop_slug === shop.slug).length !== 30) {
      throw new Error('Expected 30 products for ' + shop.name);
    }
  }
  for (const p of data.products) {
    if (!p.id || ids.has(p.id) || !p.canonical_name || !p.description || !Array.isArray(p.media)) {
      throw new Error('Invalid or repeated canonical catalogue identity');
    }
    ids.add(p.id);
    if (p.shop_slug === 'joy-totes') {
      if (!p.image_pending || p.main_image !== null || p.media.length) throw new Error('Joy Totes must remain image-pending');
    } else if (!p.main_image || !imageUrl(p.main_image) || !p.media.some(m => m.path === p.main_image)) {
      throw new Error('Missing main image for ' + p.id);
    }
    for (const m of p.media) if (!imageUrl(m.path)) throw new Error('Unsafe image path for ' + p.id);
  }
  if (data.products.reduce((n, p) => n + p.media.length, 0) !== 1095) {
    throw new Error('Expected exactly 1,095 media records');
  }
  return data.products;
}

function productCard(p, open) {
  const article = el('article', 'product-card');
  const button = el('button', 'product-card-button');
  button.type = 'button';
  button.setAttribute('aria-label', 'View details for ' + p.canonical_name);
  const visual = el('div', 'product-photo');
  const image = el('img');
  image.width = 350;
  image.height = 270;
  setProductImage(image, imageUrl(p.main_image), p.canonical_name + ' image');
  visual.append(image);
  const body = el('div', 'product-card-body');
  body.append(el('p', 'product-store', p.shop), el('h3', '', p.canonical_name));
  body.append(createPromotionPriceNode(p, createPriceNode(p)));
  body.append(el('p', 'product-meta', [p.brand, p.department].filter(Boolean).join(' · ')));
  body.append(el('p', 'product-desc', p.description));
  body.append(el('span', 'product-card-action', 'View details →'));
  button.append(visual, body);
  button.addEventListener('click', () => open(p));
  article.append(button);
  return article;
}

function productDialog(dialog, p) {
  const close = el('button', 'product-dialog-close', 'Close ×');
  close.type = 'button';
  close.addEventListener('click', () => dialog.close());
  const header = el('div', 'product-dialog-header');
  const heading = el('div');
  const title = el('h2', '', p.canonical_name);
  title.id = 'product-detail-title';
  heading.append(el('p', 'eyebrow', p.shop), title);
  header.append(heading, close);
  const inner = el('div', 'product-detail-layout');
  const gallery = el('div', 'product-detail-gallery');
  const main = el('img', 'product-detail-hero');
  setProductImage(main, imageUrl(p.main_image), p.canonical_name + ' primary image');
  gallery.append(main);
  if (p.media.length > 1) {
    const thumbs = el('div', 'product-thumbnails');
    for (const m of p.media) {
      const thumb = el('button', 'product-thumbnail');
      thumb.type = 'button';
      thumb.title = m.alt || m.view || m.role || 'Product image';
      const pic = el('img');
      setProductImage(pic, imageUrl(m.path), thumb.title);
      thumb.append(pic);
      thumb.addEventListener('click', () => {
        setProductImage(main, imageUrl(m.path), thumb.title);
        thumbs.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', 'false'));
        thumb.setAttribute('aria-pressed', 'true');
      });
      thumb.setAttribute('aria-pressed', String(m.path === p.main_image));
      thumbs.append(thumb);
    }
    gallery.append(thumbs);
  }
  const details = el('div', 'product-detail-info');
  details.append(createPromotionPriceNode(p, createPriceNode(p)));
  details.append(el('p', 'product-meta', [p.brand, p.department].filter(Boolean).join(' · ')));
  details.append(el('p', '', p.description));
  if (Array.isArray(p.descriptions)) {
    const seen = new Set([p.description.trim()]);
    for (const d of p.descriptions) {
      const text = (d.text || '').trim();
      if (!text || seen.has(text)) continue;
      seen.add(text);
      details.append(el('h3', '', d.type?.replaceAll('_', ' ') || 'Additional information'), el('p', '', text));
    }
  }
  details.append(el('p', 'product-help', p.record_type === 'PROPERTY'
    ? 'Property design reference.'
    : 'Stock availability will be confirmed before checkout.'));
  inner.append(gallery, details);
  dialog.replaceChildren(header, inner);
  dialog.setAttribute('aria-labelledby', title.id);
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

export async function initCatalogue(shops) {
  const count = document.querySelector('#catalogue-count');
  const grid = document.querySelector('#product-grid');
  const search = document.querySelector('#product-search');
  const shopSelect = document.querySelector('#product-shop-filter');
  const departmentSelect = document.querySelector('#product-department-filter');
  const more = document.querySelector('#product-load-more');
  const dialog = document.querySelector('#product-details');
  if (![count, grid, search, shopSelect, departmentSelect, more, dialog].every(Boolean)) {
    throw new Error('Missing catalogue UI container');
  }
  const response = await fetch(API);
  if (!response.ok) throw new Error('Catalogue API request failed (' + response.status + ')');
  const products = verifyCatalogue(await response.json(), shops);
  await reloadPricing();
  try { await initPromoData(); } catch (error) { console.warn("Demo promotions unavailable", error); }
  showDemoCampaignStrip(grid.parentElement);
  let visible = BATCH;
  for (const shop of shops) {
    const opt = el('option', '', shop.name);
    opt.value = shop.slug;
    shopSelect.append(opt);
  }
  const departmentsFor = () => [...new Set(products
    .filter(p => shopSelect.value === 'all' || p.shop_slug === shopSelect.value)
    .map(p => p.department).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  function refreshDepartments() {
    const previous = departmentSelect.value;
    departmentSelect.replaceChildren();
    const all = el('option', '', 'All departments'); all.value = 'all';
    departmentSelect.append(all);
    for (const dep of departmentsFor()) {
      const opt = el('option', '', dep); opt.value = dep;
      departmentSelect.append(opt);
    }
    departmentSelect.value = departmentsFor().includes(previous) ? previous : 'all';
  }
  function matches() {
    const q = search.value.trim().toLocaleLowerCase();
    return products.filter(p =>
      (shopSelect.value === 'all' || p.shop_slug === shopSelect.value) &&
      (departmentSelect.value === 'all' || p.department === departmentSelect.value) &&
      (!q || [p.canonical_name, p.id, p.brand, p.department, p.description]
        .some(x => String(x ?? '').toLocaleLowerCase().includes(q))));
  }
  function render() {
    const found = matches();
    grid.replaceChildren(...found.slice(0, visible).map(p => productCard(p, item => productDialog(dialog, item))));
    if (!found.length) grid.append(el('p', 'product-empty', 'No matching products. Try another search or filter.'));
    count.textContent = found.length + ' products found · ' + Math.min(visible, found.length) + ' shown';
    more.hidden = visible >= found.length;
  }
  const reset = () => { visible = BATCH; render(); };
  search.addEventListener('input', reset);
  shopSelect.addEventListener('change', () => { refreshDepartments(); reset(); });
  departmentSelect.addEventListener('change', reset);
  more.addEventListener('click', () => { visible += BATCH; render(); });
  for (const link of document.querySelectorAll('[data-shop-filter]')) {
    link.addEventListener('click', () => {
      shopSelect.value = link.dataset.shopFilter;
      search.value = '';
      refreshDepartments();
      reset();
    });
  }
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  refreshDepartments();
  render();
  document.addEventListener('onstore:open-product', event => {
    const selected = products.find(p => p.canonical_name === event.detail?.name && p.shop_slug === event.detail?.shop);
    if (selected) productDialog(dialog, selected);
  });
  document.documentElement.dataset.onstoreCatalogueReady = 'true';
  document.dispatchEvent(new Event('onstore:catalogue-ready'));
}
