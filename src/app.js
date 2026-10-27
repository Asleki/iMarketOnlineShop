import { renderHeader, renderFooter } from "./shared.js";
import { createShopWordmark } from "./branding.js";
import { initCatalogue } from "./catalogue-ui.js";
import { initHero } from "./hero.js";

function createShopCard(shop) {
  // Existing shop-to-catalogue filter is preserved.
  const article = document.createElement("a");
  article.className = "shop-card shop-card-link";
  article.id = "shop-" + shop.slug;
  article.href = "#catalogue";
  article.dataset.shopFilter = shop.slug;

  const icon = document.createElement("div");
  icon.className = "shop-icon";
  function showMonogram() {
    const letter = document.createElement("span");
    letter.setAttribute("aria-hidden", "true");
    letter.textContent = shop.name.charAt(0).toUpperCase();
    icon.replaceChildren(letter);
  }
  if (shop.logoUrl || shop.brandAssets?.icon) {
    const logo = document.createElement("img");
    logo.className = "shop-logo";
    logo.alt = shop.name + (shop.logoUrl ? " logo" : " temporary icon");
    logo.loading = "lazy";
    logo.decoding = "async";
    logo.addEventListener("error", showMonogram, { once: true });
    logo.src = new URL("../" + (shop.logoUrl || shop.brandAssets.icon), import.meta.url).href;
    icon.append(logo);
  } else {
    showMonogram();
  }

  const name = document.createElement("h3");
  name.className = "shop-name";
  name.textContent = shop.name;

  // The shop data selects its tier; the browser fetches its WebP asset.
  // Never print a visible tier label, medal emoji, or product identifier.
  const allowedLevels = ["bronze", "silver", "gold", "diamond"];
  const candidate = String(shop.verificationLevel || "bronze").toLowerCase();
  const tier = allowedLevels.includes(candidate) ? candidate : "bronze";
  const verification = document.createElement("span");
  verification.className = "shop-verification shop-verification--" + tier;
  verification.setAttribute("role", "img");
  verification.setAttribute("aria-label", "Verification level: " + tier);
  const shield = document.createElement("img");
  shield.className = "shop-verification-icon";
  shield.alt = "";  // A single accessible name comes from the parent.
  shield.loading = "lazy";
  shield.decoding = "async";
  shield.width = 34;
  shield.height = 34;
  shield.src = new URL("../images/verification/" + tier + ".webp", import.meta.url).href;
  verification.append(shield);
  article.append(icon, name, verification);
  return article;
}

async function main() {
  renderHeader(document.querySelector("#site-header"));
  initHero().catch(error => {
    console.error('Unable to load featured products', error);
    const hero = document.querySelector('#hero-slider');
    if (hero) hero.textContent = 'Featured products are temporarily unavailable. Browse the catalogue below.';
  });
  renderFooter(document.querySelector("#site-footer"));
  const grid = document.querySelector("#shop-grid");
  try {
    const response = await fetch(new URL("../data/shops.json", import.meta.url));
    if (!response.ok) throw new Error("Shop catalogue request failed");
    const shops = await response.json();
    if (!Array.isArray(shops) || shops.length !== 7) throw new Error("Invalid shop configuration");
    grid.replaceChildren(...shops.map(createShopCard));
    initCatalogue(shops).catch(error => {
      console.error("Could not load verified catalogue", error);
      const status = document.querySelector("#catalogue-count");
      if (status) status.textContent = "Catalogue temporarily unavailable.";
    });
  } catch (error) {
    console.error("Could not load shops", error);
    const errorMessage = document.createElement("p");
    errorMessage.textContent = "Shops are temporarily unavailable. Please try again shortly.";
    grid.replaceChildren(errorMessage);
  }
}

main();

