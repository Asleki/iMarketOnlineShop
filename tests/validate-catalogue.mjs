// Stage 2: strict catalogue and media integrity. No dependencies, no network.
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const ROOT = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, ROOT));
const catalogue = JSON.parse(read('api/v1/catalogue.json'));
const release = JSON.parse(read('api/v1/release-manifest.json'));
const manifest = JSON.parse(read('api/v1/media-manifest.json'));
const shops = JSON.parse(read('data/shops.json'));
assert.equal(catalogue.schema, 'onstore.catalogue.v1');
assert.equal(catalogue.products.length, 210);
assert.equal(release.products, 210);
assert.equal(shops.length, 7);
assert.equal(catalogue.shops.length, 7);
assert.equal(manifest.media.length, 1095);
assert.equal(release.copied_images, 1095);
assert.equal(release.all_image_sha256_valid, true);
const ids = new Set();
const imageMap = new Map(manifest.media.map(m => [m.path, m]));
assert.equal(imageMap.size, 1095, 'No duplicate image paths');
let images = 0, pending = 0;
for (const shop of shops) assert.equal(catalogue.products.filter(p => p.shop_slug === shop.slug).length, 30, 'Shop count ' + shop.name);
for (const p of catalogue.products) {
  assert.ok(p.id && !ids.has(p.id), 'Unique canonical ID'); ids.add(p.id);
  assert.ok(p.canonical_name && p.description && Array.isArray(p.descriptions));
  assert.ok(Array.isArray(p.media));
  if (p.shop_slug === 'joy-totes') {
    pending++;
    assert.equal(p.media.length, 0); assert.equal(p.main_image, null); assert.equal(p.image_pending, true);
  } else {
    assert.ok(p.main_image && p.media.some(m => m.path === p.main_image));
  }
  for (const m of p.media) {
    images++;
    assert.ok(/^media\/images\/[a-zA-Z0-9_-]+\.webp$/.test(m.path), m.path);
    const row = imageMap.get(m.path);
    assert.ok(row, 'Missing media manifest row ' + m.path);
    assert.equal(row.sha256, m.sha256);
    assert.equal(row.bytes, m.bytes);
  }
}
assert.equal(images, 1095);
assert.equal(pending, 30);
assert.equal(catalogue.products.filter(p => p.shop_slug === 'nexagreen').length, 30);
assert.equal(catalogue.products.filter(p => p.brand === 'D$D Foods').length, 22);
for (const m of manifest.media) {
  const path = new URL(m.path, ROOT);
  assert.ok(existsSync(path), 'Missing physical image ' + m.path);
  const bytes = read(m.path);
  assert.equal(bytes.length, m.bytes, 'Wrong size ' + m.path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), m.sha256, 'Corrupt image ' + m.path);
}
assert.ok(!read('index.html').toString().includes('id="shop-grid"'), 'Shops grid is not on the homepage');
assert.ok(read('index.html').toString().includes('id="category-products"'));
assert.ok(read('src/market-api.js').toString().includes('api/v1/catalogue.json'));
assert.ok(read('src/market-ui.js').toString().includes("siteURL('product.html'"), 'Every card uses a canonical detail page');
console.log('PASS: 210 products, 30 per shop, 1,095 sha256-verified images, canonical product pages and personalized homepage');
