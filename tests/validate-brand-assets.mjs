import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
const bytes = p => readFileSync(new URL(p, root));
const shops = JSON.parse(bytes('data/shops.json'));
const manifest = JSON.parse(bytes('data/brand-assets.json'));
assert.equal(shops.length,7);
assert.equal(manifest.assets.length,98,'Seven shops with 14 production assets each');
assert.equal(new Set(manifest.assets.map(a=>a.path)).size,98);
for (const shop of shops) {
  const slug=shop.slug;
  assert.equal(shop.logoUrl,`images/brands/${slug}/${slug}-logo.webp`);
  assert.equal(shop.brandAssets.status,'approved-new-logo');
  for (const [role,path] of Object.entries(shop.brandAssets)) {
    if(role==='status')continue;
    assert.ok(path.startsWith(`images/brands/${slug}/${slug}-`),`${slug} ${role}`);
    assert.ok(existsSync(new URL(path,root)),`Missing ${role}: ${path}`);
  }
  const names=readdirSync(new URL(`images/brands/${slug}/`,root));
  assert.equal(names.length,14,`${slug} exact production file count`);
  assert.ok(names.every(n=>!n.includes('-initial.')),`${slug}: no temporary placeholders`);
  for(const suffix of ['logo.png','logo.webp','logo.svg','icon.png','icon.webp','favicon.ico','apple-touch-icon.png','social.png','wordmark-light.svg','wordmark-light.png','wordmark-light.webp','wordmark-dark.svg','wordmark-dark.png','wordmark-dark.webp']) {
    assert.ok(names.includes(`${slug}-${suffix}`),`${slug}: missing ${suffix}`);
  }
  const ico=bytes(shop.brandAssets.favicon);
  assert.equal(ico.readUInt16LE(2),1);
  assert.equal(ico.readUInt16LE(4),6);
  const social=bytes(shop.brandAssets.social);
  assert.equal(social.readUInt32BE(16),1200);
  assert.equal(social.readUInt32BE(20),630);
}
for(const asset of manifest.assets) {
  assert.ok(!asset.path.includes('-initial.'),'No obsolete initial slots');
  const data=bytes(asset.path);
  assert.equal(data.length,asset.bytes,asset.path);
  assert.equal(createHash('sha256').update(data).digest('hex'),asset.sha256,asset.path);
  if(asset.path.endsWith('.svg')){
    const svg=data.toString('utf8');
    assert.ok(svg.includes('<path'),'Vector path required: '+asset.path);
    assert.ok(!/<image\b|<script\b|<foreignObject\b|https?:\/\/(?!www.w3.org)/i.test(svg),'Unsafe SVG: '+asset.path);
  }
}
console.log('PASS: seven approved live shop logos, 98 checksums, complete SVG/ICO/PNG/WebP contracts, and zero temporary initial assets');
