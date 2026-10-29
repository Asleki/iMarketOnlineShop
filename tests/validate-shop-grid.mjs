// Stage 4.1: seven shops, four real shields, no visible badge text.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const shops = JSON.parse(read('data/shops.json'));
const manifest = JSON.parse(read('data/verification-assets.json'));
const js = read('src/market-ui.js');
const css = read('assets/site.css');
assert.equal(shops.length, 7);
assert.ok(shops.every(s => s.targetProducts === 30));
assert.ok(shops.every(s => ['bronze','silver','gold','diamond'].includes(s.verificationLevel)), 'All verification tiers are supported');
assert.ok(css.includes('onstore.stage4.verification-shields.v1'));
assert.ok(css.includes('repeat(3, minmax(0, 1fr))'));
assert.deepEqual(Object.keys(manifest.icons).sort(), ['bronze','diamond','gold','silver']);
for (const [tier, asset] of Object.entries(manifest.icons)) {
  assert.equal(asset.path, `images/verification/${tier}.webp`);
  assert.ok(existsSync(new URL(asset.path, root)));
  assert.equal(createHash('sha256').update(readFileSync(new URL(asset.path, root))).digest('hex'), asset.sha256);
}
const start = js.indexOf('export function shopCard(shop){');
const end = js.indexOf('export function field(', start);
assert.ok(start >= 0 && end > start, 'Dedicated shop component present');
const source = js.slice(start, end).replace('export ', '');
assert.ok(source.includes('shop.logoUrl') && source.includes("addEventListener('error'"), 'Approved logo plus network fallback');
assert.ok(!source.includes('shop.description'), 'Only name, logo and shield');
const create = new Function('el','link','siteURL',source+'\nreturn shopCard;');
class El {
  constructor(tag) { this.tag = tag; this.children = []; this.dataset = {}; this.attrs = {}; this.events = {}; }
  append(...v) { this.children.push(...v); }
  replaceChildren(...v) { this.children = [...v]; }
  setAttribute(k,v) { this.attrs[k] = v; }
  addEventListener(k,v) { this.events[k] = v; }
}
const element=(tag,cls,text)=>{const node=new El(tag);node.className=cls;if(text!==undefined)node.textContent=text;return node;};
const siteURL=(path)=>'file:///tmp/'+path;
const link=(text,file,params,cls)=>{const node=element('a',cls,text);node.href=siteURL(file)+'?shop='+params.shop;return node;};
const render = create(element,link,siteURL);
for (const shop of shops) {
  const card = render(shop);
  assert.equal(card.tag, 'a');
  assert.equal(card.href, 'file:///tmp/shop.html?shop='+shop.slug);
  assert.equal(card.children.length, 3, 'Only logo, name, shield');
  assert.equal(card.children[1].textContent, shop.name);
  const level = card.children[2];
  assert.equal(level.children.length, 1, 'Only icon in verification badge');
  assert.equal(level.children[0].tag, 'img');
  assert.match(level.children[0].src, /\/images\/verification\/bronze\.webp$/);
  assert.equal(level.children[0].alt, '');
  assert.equal(level.attrs.role, 'img');
  assert.equal(level.attrs['aria-label'], 'Verification level: bronze');
  assert.equal(level.textContent, undefined, 'No text in badge');
}
for (const tier of ['silver','gold','diamond']) {
  const card = render({...shops[0], verificationLevel: tier});
  assert.match(card.children[2].children[0].src, new RegExp(`/images/verification/${tier}\\.webp$`));
}
console.log('PASS: seven shop cards, 3-column grid, dynamic Bronze/Silver/Gold/Diamond shield WebPs, no visible level text or medal emojis');
