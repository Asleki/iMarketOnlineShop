// Real simulated-browser test: 5 immutable slides, 7s cycling incl. reduced motion.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initHero, selectHeroSlides } from '../src/hero.js';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const products = JSON.parse(read('api/v1/catalogue.json')).products;
const chosen = selectHeroSlides(products, 5, [], () => 0.37);
assert.equal(chosen.length, 5, 'Select exactly five products');
assert.equal(new Set(chosen.map(p => p.main_image)).size, 5, 'Unique product images');
assert.equal(new Set(chosen.map(p => p.shop_slug)).size, 5, 'Shop diversity');

class Element {
  constructor(tag = 'div') {
    this.tagName = tag;
    this.children = [];
    this.attributes = new Map();
    this.events = new Map();
    this.style = {};
  }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = [...nodes]; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  addEventListener(name, fn) { this.events.set(name, fn); }
  dispatch(name, payload = {}) { this.events.get(name)?.(payload); }
}
class Img extends Element { constructor() { super('img'); } }
globalThis.HTMLImageElement = Img;
const host = new Element();
let timerFn = null, timerMs = 0;
let intervalId = 0;
const noop = () => {};
globalThis.window = {
  matchMedia: () => ({ matches: true }), // Intentionally simulate reduced-motion enabled.
  setInterval: (fn, ms) => { timerFn = fn; timerMs = ms; return ++intervalId; },
  clearInterval: noop,
  addEventListener: noop,
};
globalThis.document = {
  hidden: false,
  documentElement: { dataset: {} },
  querySelector: (selector) => selector === '#hero-slider' ? host : null,
  createElement: (tag) => tag === 'img' ? new Img() : new Element(tag),
  createElementNS: (_ns, tag) => new Element(tag),
  addEventListener: noop,
  dispatchEvent: noop,
};
globalThis.fetch = async () => ({ ok: true, json: async () => ({ products }) });

await initHero();
assert.equal(timerMs, 7000, 'Autoplay interval exactly 7000ms');
assert.equal(host.children.length, 4, 'Full-bleed hero DOM');
const [photo, _shade, _layout, controls] = host.children;
const [prev, dots, next] = controls.children;
assert.equal(dots.children.length, 5, 'Exactly five fixed navigation dots');
const active = () => dots.children.findIndex(el => el.getAttribute('aria-current') === 'true');
const firstImage = photo.src;
const images = [photo.src];
assert.equal(active(), 0, 'Starts on slide 1');
for (let i = 1; i <= 4; i++) {
  timerFn();
  assert.equal(active(), i, 'Auto-advance to slide ' + (i + 1));
  images.push(photo.src);
}
assert.equal(new Set(images).size, 5, 'Five different fixed products shown');
timerFn();
assert.equal(active(), 0, 'After slide 5, repeats slide 1');
assert.equal(photo.src, firstImage, 'No replacement products when cycle wraps');
for (let i = 0; i < 5; i++) timerFn();
assert.equal(active(), 0, 'Second complete round repeats same five');

// Touch/manual navigation also loops and must not freeze the timer.
prev.dispatch('click');
assert.equal(active(), 4, 'Previous from slide 1 wraps to slide 5');
next.dispatch('click');
assert.equal(active(), 0, 'Next from slide 5 wraps to slide 1');
assert.equal(timerMs, 7000, 'Timer restarts after manual navigation');
timerFn();
assert.equal(active(), 1, 'Autoplay still works after clicking arrows');

// A genuinely backgrounded tab can pause; visible tab resumes on the next tick.
document.hidden = true;
timerFn();
assert.equal(active(), 1, 'No unwanted background transitions');
document.hidden = false;
timerFn();
assert.equal(active(), 2, 'Resumes when tab becomes visible');

const source = read('src/hero.js');
assert.ok(source.includes('onstore.stage3.hero.fixed-five.loop.v3'));
assert.ok(source.includes('selectHeroSlides(data.products)'));
assert.ok(!source.includes('const SELECTED = ['), 'Never hardcode product names');
assert.ok(!source.includes('const upcoming = selectHeroSlides'), 'Do not replace slides at wraparound');
assert.ok(source.includes('prefers-reduced-motion'), 'Reduced-motion support explained');
console.log('PASS: real timer callback advances every 7 s, loops the same five products 1→5→1, reduced-motion setting does not block autoplay, manual arrows keep cycling');
