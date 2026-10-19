import { renderHeader, renderFooter } from "./shared.js";

function createShopCard(shop) {
  const article = document.createElement("article");
  article.className = "shop-card";
  article.id = "shop-" + shop.slug;
  const icon = document.createElement("div");
  icon.className = "shop-icon";
  function showMonogram() {
    const letter = document.createElement("span");
    letter.setAttribute("aria-hidden", "true");
    letter.textContent = shop.name.charAt(0).toUpperCase();
    icon.replaceChildren(letter);
  }
  if (shop.logoUrl) {
    const logo = document.createElement("img");
    logo.className = "shop-logo";
    logo.alt = shop.name + " logo";
    logo.loading = "lazy";
    logo.decoding = "async";
    logo.addEventListener("error", showMonogram, { once: true });
    logo.src = shop.logoUrl;
    icon.append(logo);
  } else {
    showMonogram();
  }
  const title = document.createElement("h3");
  title.textContent = shop.name;
  const summary = document.createElement("p");
  summary.textContent = shop.description;
  article.append(icon, title, summary);
  return article;
}

async function main() {
  renderHeader(document.querySelector("#site-header"));
  renderFooter(document.querySelector("#site-footer"));
  const grid = document.querySelector("#shop-grid");
  try {
    const response = await fetch(new URL("../data/shops.json", import.meta.url));
    if (!response.ok) throw new Error("Shop catalogue request failed");
    const shops = await response.json();
    if (!Array.isArray(shops) || shops.length !== 7) throw new Error("Invalid shop configuration");
    grid.replaceChildren(...shops.map(createShopCard));
  } catch (error) {
    console.error("Could not load shops", error);
    const errorMessage = document.createElement("p");
    errorMessage.textContent = "Shops are temporarily unavailable. Please try again shortly.";
    grid.replaceChildren(errorMessage);
  }
}

main();
