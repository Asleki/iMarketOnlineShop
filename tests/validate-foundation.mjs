import { readFileSync, existsSync } from "node:fs";
import assert from "node:assert/strict";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const shopList = JSON.parse(read("data/shops.json"));
const expectedNames = ["Soko Properties", "Click 'n Get", "AutoGiant Motors", "OfficeTech Solutions", "Joy Totes", "Nashaa Kicks", "NexaGreen"];
assert.deepEqual(shopList.map(s => s.name), expectedNames, "Original shops are preserved and NexaGreen is added");
assert.equal(new Set(shopList.map(s => s.id)).size, 7, "Unique shop identifiers");
assert.equal(new Set(shopList.map(s => s.slug)).size, 7, "Unique shop URL slugs");
assert.ok(shopList.every(s => s.targetProducts === 30), "Each shop targets 30 verified NoveGeo products");
const nexaGreen = shopList.find(shop => shop.id === "nexagreen");
assert.equal(nexaGreen.slug, "nexagreen");
assert.deepEqual(nexaGreen.categories, ["Foods", "Beverages"], "NexaGreen sells only foods and beverages");
assert.equal(nexaGreen.logoUrl, "assets/brand/nexagreen-mark.svg", "NexaGreen uses the approved N leaf");
const index = read("index.html");
assert.equal((index.match(/rel="stylesheet"/g) || []).length, 1, "Use one shared stylesheet");
assert.equal((index.match(/<script\b/g) || []).length, 1, "Use one module entrypoint");
assert.ok(index.includes("./src/app.js"), "Entrypoint is module");
assert.ok(read("src/app.js").includes("./shared.js"), "Shared chrome is reused");
assert.ok(read("src/media.js").includes("FALLBACK_IMAGE_URL"), "One shared image fallback");
assert.ok(existsSync(new URL("../images/placeholder.webp", import.meta.url)), "Fallback image exists");
const expectedLogos = new Map([
  ["soko_properties", "images/logo/soko-logo.webp"],
  ["click_n_get", "images/logo/shop-clicknget.webp"],
  ["autogiant_motors", "images/logo/autogiant-logo.webp"],
  ["officetech_solutions", "images/logo/officetech-logo.webp"]
]);
assert.equal(shopList.filter(shop => shop.logoUrl).length, 5, "Four original and one newly approved logo");
for (const shop of shopList) {
  const expected = shop.id === "nexagreen" ? "assets/brand/nexagreen-mark.svg" : (expectedLogos.get(shop.id) ?? null);
  assert.equal(shop.logoUrl, expected, "Logo mapping must match original brand identity");
  if (expected) assert.ok(existsSync(new URL("../" + expected, import.meta.url)), "Original logo exists: " + expected);
}
assert.ok(read("src/app.js").includes("shop.logoUrl"), "Shop cards use mapped logo assets");
assert.ok(read("src/app.js").includes("showMonogram"), "Shop cards have a missing-logo fallback");


const css = read("assets/site.css");
for (const name of ["--font-body","--font-display","--font-mono","--color-text","--color-brand","--color-bg","--color-focus","--radius-lg","--space-4"]) {
  assert.ok(css.includes(name + ":"), "Missing foundational token: " + name);
}
assert.ok(css.includes(':root[data-theme="dark"]'), "Explicit dark theme tokens exist");
assert.ok(css.includes("prefers-color-scheme: dark"), "OS dark theme fallback exists");
assert.ok(css.includes("prefers-reduced-motion"), "Reduced motion supported");
assert.ok(css.includes(".theme-toggle"), "Single shared theme control style exists");
assert.ok(read("src/shared.js").includes("bindThemeToggle"), "Shared header wires a theme toggle");
assert.ok(read("src/theme.js").includes("window.localStorage"), "Theme choice is persisted");
const sprite = read("assets/icons.svg");
const ids = [...sprite.matchAll(/<symbol id="([a-z0-9-]+)"/g)].map(m => m[1]);
assert.ok(ids.length >= 35, "Site-wide SVG icon set available");
assert.equal(new Set(ids).size, ids.length, "SVG icon names must not duplicate");
for (const icon of ["search","shopping-cart","heart","sun","moon","filter","truck","clock","tag","images","user-round","footprints","building","laptop"]) {
  assert.ok(ids.includes(icon), "Required icon is missing: " + icon);
}
assert.ok(read("src/icons.js").includes('import.meta.url'), "Icon URLs resolve from the module, not from a fragile page path");
assert.ok(index.includes('rel="icon"') && index.includes('rel="manifest"'), "Brand favicon and manifest are linked");
for (const key of ['name="description"','name="robots"','property="og:title"','property="og:description"','name="twitter:card"','name="theme-color"']) {
  assert.ok(index.includes(key), "SEO/metadata missing: " + key);
}
assert.ok(index.includes('noindex, nofollow'), "Non-production rebuild branch must not be indexed");
assert.ok(!index.includes('rel="canonical"'), "Do not invent the production canonical URL");
const manifest = JSON.parse(read("site.webmanifest"));
assert.equal(manifest.name, "onStore");
assert.equal(manifest.display, "browser", "This foundation is not yet an installable PWA");
assert.equal(manifest.icons[0].src, "./assets/brand/onstore-mark-192.png");
assert.ok(existsSync(new URL("../assets/brand/onstore-mark.svg", import.meta.url)), "Approved SVG favicon exists");
for (const file of ["assets/brand/onstore-favicon.ico","assets/brand/onstore-mark-192.png","assets/brand/onstore-mark-512.png","assets/brand/nexagreen-mark-512.webp","assets/brand/onstore-social-1200x630.png"]) {
  assert.ok(existsSync(new URL("../"+file, import.meta.url)), "Branded image variant missing: "+file);
}
assert.ok(read("src/seo.js").includes("canonicalUrl"), "Reusable SEO metadata helper");
console.log("PASS: accessible light/dark tokens, font stacks, icon sprite, SVG favicon, staging SEO metadata and logo preservation");
console.log("PASS: seven shops, exact logos, shared CSS, light/dark tokens, accessible icon sprite, SVG favicon and staging SEO metadata");

for (const file of ["assets/brand/onstore-mark.svg","assets/brand/nexagreen-mark.svg","assets/brand/onstore-wordmark-on-light.svg","assets/brand/onstore-wordmark-on-dark.svg"]) {
  assert.ok(existsSync(new URL("../"+file, import.meta.url)), "Approved SVG master missing: " + file);
  assert.ok(read(file).includes("<svg") && read(file).includes("viewBox="), "Native vector geometry required: " + file);
}
assert.ok(read("src/shared.js").includes("brand-mark") && read("src/shared.js").includes("wordmark-on-dark"), "Header uses bag logo and theme-aware wordmark");
assert.ok(index.includes("onstore-mark.svg"), "Approved main logo used in homepage");
console.log("PASS: approved onStore and NexaGreen branding wired into the shared website");
