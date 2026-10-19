// Shared site chrome: exactly one header and footer implementation.
import { bindThemeToggle } from "./theme.js";
const HOME_URL = new URL("../index.html", import.meta.url);
const urlOnHome = hash => new URL(HOME_URL.href + hash).href;
export function renderHeader(host) {
  if (!host) throw new Error("Missing shared-header target");
  const header = document.createElement("header");
  header.className = "site-header";
  const inner = document.createElement("div");
  inner.className = "shell header-inner";
  const brand = document.createElement("a");
  brand.className = "brand";
  brand.href = HOME_URL.href;
  brand.setAttribute("aria-label", "onStore home");
  brand.append(document.createTextNode("on"));
  const brandAccent = document.createElement("span");
  brandAccent.textContent = "Store";
  brand.append(brandAccent);
  const nav = document.createElement("nav");
  nav.className = "site-nav";
  nav.setAttribute("aria-label", "Main navigation");
  for (const [title, hash] of [["Shops", "#shops"], ["About", "#about"]]) {
    const link = document.createElement("a");
    link.href = urlOnHome(hash);
    link.textContent = title;
    nav.append(link);
  }
  const actions = document.createElement("div");
  actions.className = "header-actions";
  const themeButton = document.createElement("button");
  themeButton.className = "theme-toggle";
  themeButton.type = "button";
  bindThemeToggle(themeButton);
  actions.append(themeButton);
  inner.append(brand, nav, actions);
  header.append(inner);
  host.replaceChildren(header);
}
export function renderFooter(host) {
  if (!host) throw new Error("Missing shared-footer target");
  const footer = document.createElement("footer");
  footer.className = "site-footer";
  const inner = document.createElement("div");
  inner.className = "shell footer-inner";
  const copyright = document.createElement("p");
  copyright.textContent = "© onStore — discover our seven shops.";
  const nav = document.createElement("nav");
  nav.setAttribute("aria-label", "Footer navigation");
  for (const [title, hash] of [["Shops", "#shops"], ["About", "#about"]]) {
    const link = document.createElement("a");
    link.href = urlOnHome(hash);
    link.textContent = title;
    nav.append(link);
  }
  inner.append(copyright, nav);
  footer.append(inner);
  host.replaceChildren(footer);
}
