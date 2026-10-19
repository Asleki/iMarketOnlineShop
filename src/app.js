import { renderHeader, renderFooter } from "./shared.js";

function createShopCard(shop) {
  const article = document.createElement("article");
  article.className = "shop-card";
  article.id = "shop-" + shop.slug;
  const icon = document.createElement("div");
  icon.className = "shop-icon";
  icon.textContent = shop.name.charAt(0).toUpperCase();
  icon.setAttribute("aria-hidden", "true");
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
    if (!Array.isArray(shops) || shops.length !== 6) throw new Error("Invalid shop configuration");
    grid.replaceChildren(...shops.map(createShopCard));
  } catch (error) {
    console.error("Could not load shops", error);
    const errorMessage = document.createElement("p");
    errorMessage.textContent = "Shops are temporarily unavailable. Please try again shortly.";
    grid.replaceChildren(errorMessage);
  }
}

main();
