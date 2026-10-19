import { readFileSync, existsSync } from "node:fs";
import assert from "node:assert/strict";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const shopList = JSON.parse(read("data/shops.json"));
const expectedNames = ["Soko Properties", "Click 'n Get", "AutoGiant Motors", "OfficeTech Solutions", "Joy Totes", "Nashaa Kicks"];
assert.deepEqual(shopList.map(s => s.name), expectedNames, "Original shop names must remain unchanged");
assert.equal(new Set(shopList.map(s => s.id)).size, 6, "Unique shop identifiers");
assert.equal(new Set(shopList.map(s => s.slug)).size, 6, "Unique shop URL slugs");
assert.ok(shopList.every(s => s.targetProducts === 30), "Each shop targets 30 verified NoveGeo products");
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
assert.equal(shopList.filter(shop => shop.logoUrl).length, 4, "Four source-backed logos, no invented assets");
for (const shop of shopList) {
  const expected = expectedLogos.get(shop.id) ?? null;
  assert.equal(shop.logoUrl, expected, "Logo mapping must match original brand identity");
  if (expected) assert.ok(existsSync(new URL("../" + expected, import.meta.url)), "Original logo exists: " + expected);
}
assert.ok(read("src/app.js").includes("shop.logoUrl"), "Shop cards use mapped logo assets");
assert.ok(read("src/app.js").includes("showMonogram"), "Shop cards have a missing-logo fallback");
console.log("PASS: six original shops, four restored WebP logos, two missing-logo fallbacks, shared CSS/JS and product media fallback");
