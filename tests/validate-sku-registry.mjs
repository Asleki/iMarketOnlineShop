// onStore C1: validate the independent, expandable shop-specific SKU registry.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const codes = JSON.parse(read('data/commerce/shop-codes.json'));
const state = JSON.parse(read('data/commerce/sku-registry.json'));
const catalogue = JSON.parse(read('api/v1/catalogue.json'));
const shops = JSON.parse(read('data/shops.json'));
const lines = read('data/commerce/sku-events.jsonl').trim().split('\n').filter(Boolean).map(JSON.parse);
assert.equal(codes.schema, 'onstore.shop-codes.v1');
assert.equal(state.schema, 'onstore.sku-registry.v1');
assert.equal(state.item_count, state.items.length);
assert.deepEqual(new Set(shops.map(s => s.slug)), new Set(codes.shops.map(s => s.slug)));
assert.equal(new Set(codes.shops.map(s => s.code)).size, codes.shops.length);
const byCode = new Map(codes.shops.map(s => [s.slug, s.code]));
const bySku = new Map();
const canonicalLinks = new Set();
for (const item of state.items) {
  assert.ok(!bySku.has(item.sku), 'SKU cannot be recycled or duplicated');
  bySku.set(item.sku, item);
  assert.ok(byCode.has(item.shop_slug));
  assert.equal(item.sku, `OS-${byCode.get(item.shop_slug)}-${String(item.sequence).padStart(6, '0')}`);
  assert.ok(item.sequence > 0);
  assert.match(item.variant_key, /^[a-z0-9][a-z0-9._-]{0,63}$/);
  assert.ok(['registered','draft'].includes(item.status));
  assert.ok(item.canonical_id || item.merchant_item_id);
  if (item.canonical_id) {
    assert.match(item.canonical_id, /^(NCP|NRE)-[0-9]{6}-[0-9]$/);
    const key = [item.shop_slug, item.canonical_id, item.variant_key].join('|');
    assert.ok(!canonicalLinks.has(key), 'Canonical product/variant duplicate');
    canonicalLinks.add(key);
  }
}
for (const shop of codes.shops) {
  const issued = state.items.filter(i => i.shop_slug === shop.slug).map(i => i.sequence);
  issued.sort((a,b) => a - b);
  assert.deepEqual(issued, Array.from({length: issued.length}, (_, i) => i + 1));
  assert.equal(state.shop_sequences[shop.slug].next_sequence, issued.length + 1);
}
for (const p of catalogue.products) {
  assert.ok(canonicalLinks.has([p.shop_slug, p.id, 'default'].join('|')), `Canonical catalogue product unassigned: ${p.id}`);
}
const assignments = lines.filter(e => e.event_type === 'sku_assigned');
assert.equal(assignments.length, state.items.length, 'Every SKU has one assignment event');
for (const assignment of assignments) {
  assert.ok(bySku.has(assignment.sku));
}
assert.ok(existsSync(new URL('tools/sku_registry.py', root)));
console.log(`PASS: ${state.items.length} unique shop-specific SKUs; ${catalogue.products.length} canonical product links; append-only event history; extendable numbering`);
