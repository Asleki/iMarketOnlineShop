import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const R=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,R),'utf8');
const json=p=>JSON.parse(read(p));
const state=json('data/commerce/promotion-state.json');
const publicView=json('data/commerce/public-promotions.json');
const inv=json('data/commerce/inventory-state.json');
const prices=json('data/commerce/base-prices.json');
const skus=json('data/commerce/sku-registry.json');
assert.equal(state.schema,'onstore.promotion-state.v2');
assert.equal(state.campaign_count,18);
assert.equal(state.environment,'simulation');
assert.ok(state.campaigns.some(c=>c.status==='active'));
assert.ok(state.campaigns.some(c=>c.type==='flash_sale'&&c.status==='active'));
assert.ok(state.campaigns.filter(c=>c.type==='free_shipping'||c.type==='new_arrivals').every(c=>c.status==='draft'));
assert.ok(state.campaigns.filter(c=>c.type==='black_friday').every(c=>c.status==='draft'));
assert.equal(publicView.schema,'onstore.public-promotions.v2');
assert.equal(publicView.environment,'simulation');
assert.ok(publicView.campaign_count>=2);
const stock=new Map(inv.entries.map(x=>[x.sku,x]));
const maps=new Map(skus.items.map(x=>[x.sku,x]));
const cost=new Map(prices.entries.map(x=>[x.sku,x]));
for(const c of state.campaigns){
 assert.ok(['active','draft','paused','cancelled'].includes(c.status));
 if(c.status==='active') {
  assert.ok(c.target_skus.length>0);
  if(c.type==='flash_sale'){assert.ok(Date.parse(c.end_utc)>Date.parse(c.start_utc));}
  for(const sku of c.target_skus){
   assert.equal(maps.get(sku)?.status,'registered');
   assert.ok(cost.get(sku)?.usd_cents>0);
   assert.notEqual(stock.get(sku)?.stock_mode,'property_reference');
   if(c.owner_scope==='shop') assert.equal(maps.get(sku)?.shop_slug,c.shop_slug);
  }
 }
}
for(const c of publicView.campaigns){
 assert.ok(c.discount_bps>0&&c.discount_bps<=5000);
 assert.ok(c.target_products.length>0);
 assert.ok(!c.target_products.some(p=>p.shop_slug==='soko-properties'));
}
const ui=read('src/catalogue-ui.js'),promo=read('src/commerce-promotions.js'),pkg=json('package.json');
assert.ok(ui.includes('createPromotionPriceNode'));
assert.ok(ui.includes('initPromoData'));
assert.ok(ui.includes('showDemoCampaignStrip'));
assert.ok(promo.includes('onstore:currency-changed'));
assert.ok(promo.includes('convertedMinor'));
assert.ok(promo.includes('best_eligible_only')||promo.includes('b.discount_bps - a.discount_bps'));
assert.ok(pkg.scripts.test.includes('validate-promotions-c4.mjs'));
assert.ok(read('assets/site.css').includes('onstore.c4.simulated-offers'));
console.log(`PASS: C4 ${state.campaign_count} campaigns, ${publicView.campaign_count} active demo campaigns, best-discount wins, multi-currency price cards`);
