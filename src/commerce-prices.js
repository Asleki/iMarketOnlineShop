// onStore C2 — read-only customer currency selector and price presentation.
// Commercial writes are performed by local pricing CLI; browser has no write API.
const SOURCE = new URL('../data/commerce/public-prices.json', import.meta.url);
const OPTIONS = [
  {code:'USD', label:'USD — US Dollar', locale:'en-US'},
  {code:'KES', label:'KES — Kenyan Shilling', locale:'en-KE'},
  {code:'GBP', label:'GBP — British Pound', locale:'en-GB'}
];
const STORAGE_KEY = 'onstore.currency.v1';
const KEYS = new WeakMap();
let active = 'USD';
let data = null;
let dataIndex = new Map();
let promise = null;
let started = false;
let lastFetch = 0;
try { const previous = globalThis.localStorage?.getItem(STORAGE_KEY); if (OPTIONS.some(v=>v.code===previous)) active=previous; } catch { /* private mode */ }

export const supportedCurrencies = Object.freeze(OPTIONS.map(o=>o.code));
export const selectedCurrency = () => active;

export function convertedMinor(usdCents, rateScaled, rateScale=1_000_000) {
  if (!Number.isSafeInteger(usdCents) || usdCents < 0 || !Number.isSafeInteger(rateScaled) || rateScaled <= 0 || !Number.isSafeInteger(rateScale) || rateScale<=0) {
    throw new RangeError('Invalid positive currency conversion inputs');
  }
  // Calculations use integer arithmetic to prevent accumulating float rounding error.
  const cents = (BigInt(usdCents)*BigInt(rateScaled)+BigInt(rateScale)/2n)/BigInt(rateScale);
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('Converted amount exceeds safe range');
  return Number(cents);
}

export function formattedMoney(minor, currency) {
  const option = OPTIONS.find(x=>x.code===currency);
  if (!option || !Number.isSafeInteger(minor)) throw new RangeError('Invalid currency/price');
  return new Intl.NumberFormat(option.locale, {style:'currency',currency,minimumFractionDigits:2,maximumFractionDigits:2}).format(minor/100);
}

function rowKey(shop, id) {return String(shop)+'|'+String(id);}
function indexRows(payload) {
  if (payload?.schema !== 'onstore.public-prices.v1' || !Array.isArray(payload.entries) || payload.price_count !== payload.entries.length || payload.rate_scale !== 1_000_000) throw new Error('Invalid pricing data version');
  if (!OPTIONS.every(x=>Number.isSafeInteger(payload.rates_scaled?.[x.code]) && payload.rates_scaled[x.code]>0)) throw new Error('Missing currency conversion rates');
  const indexed = new Map();
  for (const item of payload.entries) {
    if (!item.shop_slug || !Number.isSafeInteger(item.usd_cents) || item.usd_cents<=0) throw new Error('Invalid public price record');
    // C1 permits merchant-only draft items. Until they're published into the catalogue, they have no customer-facing lookup key.
    if (!item.canonical_id) continue;
    const key = rowKey(item.shop_slug,item.canonical_id);
    if (indexed.has(key)) throw new Error('Duplicate public price');
    indexed.set(key,item);
  }
  return indexed;
}
function refreshVisiblePrices() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('[data-onstore-price]').forEach(node => {
    const info = KEYS.get(node);
    if (!info) return;
    const price = dataIndex.get(rowKey(info.shop_slug, info.id));
    if (!price || !data) {
      node.textContent='Price on request';
      return;
    }
    const amount = convertedMinor(price.usd_cents,data.rates_scaled[active],data.rate_scale);
    node.textContent=formattedMoney(amount,active);
    node.title=node.textContent;
    node.setAttribute('aria-label',node.textContent);
  });
}
export async function reloadPricing({force=false}={}) {
  if (!force && promise) return promise;
  promise=(async()=>{
    const response=await fetch(SOURCE,{cache:'no-store'});
    if (!response.ok) throw new Error('Unable to load marketplace price book');
    const next=await response.json();
    const mapped=indexRows(next);
    data=next;dataIndex=mapped;lastFetch=Date.now();
    refreshVisiblePrices();
    return next;
  })();
  try {return await promise;} finally {promise=null;}
}

// onstore.c2.1.currency-picker.flags.dropdown — header-only UI refinement.
// Use an anchored HTML menu instead of Android's full-screen native <select>.
export function createCurrencyPicker() {
  const root = document.createElement('div');
  root.className = 'commerce-currency-popover';
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'commerce-currency-trigger';
  trigger.setAttribute('aria-label', 'Currency: ' + active + '. Change display currency');
  trigger.setAttribute('aria-haspopup', 'menu');
  trigger.setAttribute('aria-expanded', 'false');
  const flag = document.createElement('span');
  flag.className = 'commerce-currency-flag';
  flag.setAttribute('aria-hidden', 'true');
  const code = document.createElement('span');
  code.className = 'commerce-currency-code';
  const caret = document.createElement('span');
  caret.className = 'commerce-currency-caret';
  caret.textContent = '⌄';
  caret.setAttribute('aria-hidden', 'true');
  trigger.append(flag, code, caret);

  const menu = document.createElement('div');
  menu.className = 'commerce-currency-menu';
  menu.id = 'onstore-currency-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'Display currency');
  menu.hidden = true;
  trigger.setAttribute('aria-controls', menu.id);

  const flags = Object.freeze({USD:'🇺🇸', KES:'🇰🇪', GBP:'🇬🇧'});
  const buttons = [];
  let pointerSelection = false;
  let isOpen = false;
  function update() {
    flag.textContent = flags[active];
    code.textContent = active;
    trigger.setAttribute('aria-label', 'Currency: ' + active + '. Change display currency');
    for (const item of buttons) {
      const current = item.dataset.currency === active;
      item.setAttribute('aria-checked', String(current));
    }
  }
  function open(focusItem = false) {
    isOpen = true;
    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    update();
    if (focusItem) (buttons.find(item => item.dataset.currency === active) || buttons[0]).focus({preventScroll:true});
  }
  function close({restoreFocus=false}={}) {
    isOpen = false;
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    if (restoreFocus) trigger.focus({preventScroll:true});
  }
  function choose(value) {
    if (!supportedCurrencies.includes(value)) return;
    active = value;
    try {globalThis.localStorage?.setItem(STORAGE_KEY,active);} catch { /* private mode */ }
    update();
    // Keep any future currency pickers in sync without a page reload.
    document.querySelectorAll('.commerce-currency-popover').forEach(other => {
      if (other !== root && typeof other.updateCurrency === 'function') other.updateCurrency();
    });
    refreshVisiblePrices();
    document.dispatchEvent(new CustomEvent('onstore:currency-changed',{detail:{currency:active}}));
    close({restoreFocus:!pointerSelection});
    if (pointerSelection) document.activeElement?.blur(); // Avoid a sticky yellow touch-focus ring.
  }
  for (const option of OPTIONS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'commerce-currency-option';
    button.setAttribute('role', 'menuitemradio');
    button.dataset.currency = option.code;
    button.setAttribute('aria-label', option.label);
    const f = document.createElement('span');
    f.className = 'commerce-currency-flag';
    f.setAttribute('aria-hidden','true');
    f.textContent = flags[option.code];
    const description = document.createElement('span');
    description.className = 'commerce-currency-option-label';
    description.textContent = option.label;
    const tick = document.createElement('span');
    tick.className = 'commerce-currency-selected';
    tick.textContent = '✓';
    tick.setAttribute('aria-hidden','true');
    button.append(f,description,tick);
    button.addEventListener('pointerdown', () => {pointerSelection = true;});
    button.addEventListener('click', () => {
      choose(option.code);
      pointerSelection = false;
    });
    menu.append(button);
    buttons.push(button);
  }
  function moveFocus(index) {buttons[(index+buttons.length)%buttons.length].focus({preventScroll:true});}
  trigger.addEventListener('click', () => {
    if (isOpen) close(); else open(false);
  });
  trigger.addEventListener('keydown', event => {
    if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
      event.preventDefault();
      open(true);
      if(event.key === 'Home') moveFocus(0);
      if(event.key === 'End') moveFocus(buttons.length-1);
      if(event.key === 'ArrowUp') moveFocus(buttons.length-1);
    } else if (event.key === 'Escape') close();
  });
  menu.addEventListener('keydown', event => {
    const index = buttons.indexOf(document.activeElement);
    if(event.key === 'Escape') {event.preventDefault();close({restoreFocus:true});}
    else if(event.key === 'ArrowDown') {event.preventDefault();moveFocus(index+1);}
    else if(event.key === 'ArrowUp') {event.preventDefault();moveFocus(index-1);}
    else if(event.key === 'Home') {event.preventDefault();moveFocus(0);}
    else if(event.key === 'End') {event.preventDefault();moveFocus(buttons.length-1);}
    else if(event.key === 'Tab') close();
  });
  document.addEventListener('pointerdown', event => {
    if (isOpen && !root.contains(event.target)) close();
  });
  document.addEventListener('keydown', event => {
    if(isOpen && event.key==='Escape') close({restoreFocus:true});
  });
  // Exposes only UI synchronization, never pricing writes.
  root.updateCurrency = update;
  root.append(trigger, menu);
  update();
  if (!started && typeof document!=='undefined') {
    started=true;
    document.addEventListener('visibilitychange',()=>{if(!document.hidden && Date.now()-lastFetch>60_000)reloadPricing({force:true}).catch(console.error);});
    globalThis.setInterval?.(()=>{if(!document.hidden && Date.now()-lastFetch>60_000)reloadPricing({force:true}).catch(console.error);},60_000);
  }
  return root;
}

export function createPriceNode(product) {
  const node=document.createElement('p');node.className='product-price';
  node.setAttribute('data-onstore-price','');
  KEYS.set(node,{shop_slug:product.shop_slug,id:product.id});
  node.textContent='Price loading…';
  // Detached nodes are updated by the next render when prices are ready.
  const price=dataIndex.get(rowKey(product.shop_slug,product.id));
  if (price && data) {
    const minor=convertedMinor(price.usd_cents,data.rates_scaled[active],data.rate_scale);
    node.textContent=formattedMoney(minor,active);
    node.title=node.textContent;
  }
  return node;
}
