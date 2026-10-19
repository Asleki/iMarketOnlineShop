import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const shops = JSON.parse(read('data/shops.json'));
const manifest = JSON.parse(read('data/brand-assets.json'));
const expected = {
  'soko-properties': '007a098b61bbc8f7950dabda221220aaf3d6fc2f',
  'click-n-get': '698df9382462d4b691e89ae3e136d8156bb0bb6e',
  'autogiant-motors': 'cd4eeb06e4d8d8dc8d418671ce284b1b470b8305',
  'officetech-solutions': 'd9815c344cb7849ff5ca0182adc0464e30a6ba5f'
};
for (const shop of shops) {
  assert.ok(shop.brandAssets);
  for (const [role, path] of Object.entries(shop.brandAssets)) {
    if (role === 'status') continue;
    assert.ok(path.startsWith(`images/brands/${shop.slug}/${shop.slug}-`));
    assert.ok(existsSync(new URL(path, root)), 'Missing ' + role + ': ' + path);
  }
  if (expected[shop.slug]) {
    const bytes = read(shop.logoUrl);
    const hash = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    assert.equal(hash, expected[shop.slug], 'Original logo bytes changed');
  }
  if (['joy-totes','nashaa-kicks'].includes(shop.slug)) {
    assert.equal(shop.logoUrl, null);
    assert.equal(shop.brandAssets.status, 'temporary-initial');
  }
  const ico = read(shop.brandAssets.favicon);
  assert.equal(ico.readUInt16LE(2), 1, 'ICO type');
  assert.equal(ico.readUInt16LE(4), 6, 'Six favicon sizes');
  const social = read(shop.brandAssets.social);
  assert.equal(social.readUInt32BE(16), 1200);
  assert.equal(social.readUInt32BE(20), 630);
}
assert.equal(new Set(manifest.assets.map(a => a.path)).size, manifest.assets.length);
for (const asset of manifest.assets) {
  const bytes = read(asset.path);
  assert.equal(bytes.length, asset.bytes, asset.path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256, asset.path);
  if (asset.path.endsWith('.svg')) {
    const svg = bytes.toString();
    assert.ok(svg.includes('<path'), 'Vector paths required: ' + asset.path);
    assert.ok(!/<image|<script|<foreignObject|https?:\/\/(?!www.w3.org)/i.test(svg), 'No embedded raster or external resource');
  }
}
console.log(`PASS: ${manifest.assets.length} assets, checksums, naming, 4 unchanged originals, ICO sizes and social dimensions`);
