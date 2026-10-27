// C4 simulation offers; read-only frontend. Campaign source is immutable-audit CLI.
// C2's USD base prices/rates remain authoritative, C3 stock remains untouched.
import {createPriceNode, selectedCurrency, convertedMinor, formattedMoney} from './commerce-prices.js';
const ROOT = new URL('../', import.meta.url);
const PROMOS = new URL('data/commerce/public-promotions.json', ROOT);
const PRICES = new URL('data/commerce/public-prices.json', ROOT);
const KEYS = new WeakMap();
let campaigns = [];
let prices = new Map();
let rates = null;
let started = false;
let latest = 0;
const key = (shop, id) => `${shop}|${id}`;
const pct = bps => `${(bps / 100).toFixed(bps % 100 ? 2 : 0)}%`;
const eligibleNow = c => c?.status !== 'paused' && (!c.start_utc || Date.now() >= Date.parse(c.start_utc)) && (!c.end_utc || Date.now() < Date.parse(c.end_utc));

async function readJSON(url) {
  const resp = await fetch(url, {cache: 'no-store'});
  if (!resp.ok) throw new Error(`C4 data unavailable (${resp.status})`);
  return resp.json();
}
function validateOffers(data) {
  if (data?.schema !== 'onstore.public-promotions.v2' || data.environment !== 'simulation' || !Array.isArray(data.campaigns) || data.campaign_count !== data.campaigns.length) {
    throw new Error('Invalid C4 campaign data');
  }
  const keyed = [];
  for (const campaign of data.campaigns) {
    if (!Number.isInteger(campaign.discount_bps) || campaign.discount_bps < 1 || campaign.discount_bps > 5000 || !Array.isArray(campaign.target_products)) throw new Error('Invalid C4 discount');
    const set = new Set(campaign.target_products.map(item => key(item.shop_slug, item.canonical_id)));
    keyed.push({...campaign, keys: set});
  }
  return keyed;
}
function validatePrices(data) {
  if (data?.schema !== 'onstore.public-prices.v1' || data.rate_scale !== 1000000 || !Array.isArray(data.entries)) throw new Error('Invalid C2 public prices');
  const map = new Map();
  for (const p of data.entries) {
    if (p.canonical_id && p.shop_slug) map.set(key(p.shop_slug,p.canonical_id),p);
  }
  return map;
}
function best(p) {
  const k = key(p.shop_slug,p.id);
  const matches = campaigns.filter(c => eligibleNow(c) && c.keys.has(k));
  matches.sort((a,b) => b.discount_bps - a.discount_bps || a.campaign_id.localeCompare(b.campaign_id));
  return matches[0] ?? null;
}
function updateCard(wrapper) {
  const p = KEYS.get(wrapper);
  if (!p) return;
  const base = wrapper.querySelector('.product-price');
  const saving = wrapper.querySelector('.onstore-sale-row');
  const badge = wrapper.querySelector('.onstore-promotion-badge');
  const offer = best(p);
  const record = prices.get(key(p.shop_slug,p.id));
  if (!offer || !record || !rates || record.price_mode === 'design_scenario') {
    if (base) base.classList.remove('onstore-original-price');
    if (saving) saving.hidden = true;
    wrapper.classList.remove('onstore-promo-active');
    return;
  }
  const after = Number((BigInt(record.usd_cents) * BigInt(10000 - offer.discount_bps) + 5000n) / 10000n);
  if (after <= 0) return;
  const currency = selectedCurrency();
  const price = formattedMoney(convertedMinor(after, rates.rates_scaled[currency], rates.rate_scale),currency);
  const display = saving.querySelector('.onstore-sale-value');
  display.textContent = 'Est. ' + price;
  display.title = 'Simulation only; estimated product price and demo discount, not a live offer';
  badge.textContent = `Demo −${pct(offer.discount_bps)}`;
  badge.title = offer.name + ' · simulated offer';
  saving.hidden = false;
  base.classList.add('onstore-original-price');
  wrapper.classList.add('onstore-promo-active');
}
function updateAll() {
  if (typeof document === 'undefined') return;
  for (const wrapper of document.querySelectorAll('.onstore-promo-price')) updateCard(wrapper);
  updateBanner();
}
function updateBanner() {
  const banner = document.querySelector('.onstore-campaign-banner');
  if (!banner) return;
  const current=campaigns.filter(eligibleNow);
  if (!current.length) {banner.hidden=true;return;}
  const biggest = Math.max(...current.map(c=>c.discount_bps));
  banner.textContent = `Demo offers on selected products · up to ${pct(biggest)} off`;
  banner.hidden=false;
}
export async function initPromoData() {
  // Refresh data, but never mutate C1/C2/C3 sources from the browser.
  const [promotionData,priceData] = await Promise.all([readJSON(PROMOS),readJSON(PRICES)]);
  const next = validateOffers(promotionData);
  const priceMap = validatePrices(priceData);
  if (!['USD','KES','GBP'].every(k => Number.isSafeInteger(priceData.rates_scaled?.[k]))) throw new Error('Missing C2 currency rates');
  campaigns=next;prices=priceMap;rates=priceData;latest=Date.now();updateAll();
  if (!started) {
    started=true;
    document.addEventListener('onstore:currency-changed',updateAll);
    document.addEventListener('visibilitychange',()=>{
      if (!document.hidden) {
        updateAll();
        if (Date.now()-latest>60000) initPromoData().catch(console.error);
      }
    });
    window.setInterval(()=>{
      if (!document.hidden) {
        updateAll();
        if (Date.now()-latest>60000) initPromoData().catch(console.error);
      }
    },15000);
  }
}
export function createPromotionPriceNode(p, baseNode) {
  const wrapper=document.createElement('div');wrapper.className='onstore-promo-price';
  // Reuse the original C2 DOM node so currency changes keep updating it.
  const base=baseNode ?? createPriceNode(p);
  const sale=document.createElement('div');sale.className='onstore-sale-row';sale.hidden=true;
  const price=document.createElement('strong');price.className='onstore-sale-value';
  const badge=document.createElement('span');badge.className='onstore-promotion-badge';
  sale.append(price,badge);wrapper.append(base,sale);
  KEYS.set(wrapper,p);updateCard(wrapper);
  return wrapper;
}
export function showDemoCampaignStrip(target) {
  if (!target || target.querySelector('.onstore-campaign-banner')) return;
  const node=document.createElement('div');node.className='onstore-campaign-banner';
  node.setAttribute('role','status');
  node.hidden=true;
  target.prepend(node);updateBanner();
}
