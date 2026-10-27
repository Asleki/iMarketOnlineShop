import { createCurrencyPicker } from './commerce-prices.js';
import { createIcon } from './icons.js';
// Shared site chrome: exactly one header and footer implementation.
import { bindThemeToggle } from "./theme.js";
const HOME_URL = new URL("../index.html", import.meta.url);
const urlOnHome = hash => new URL(HOME_URL.href + hash).href;
export function renderHeader(host) {
  if (!host) throw new Error('Missing header host');
  const element = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const site = element('header', 'commerce-header');
  const top = element('div', 'commerce-top shell');
  const brand = element('a', 'commerce-brand');
  brand.href = HOME_URL.href;
  brand.setAttribute('aria-label', 'onStore — home');
  const bag = element('img', 'brand-mark');
  bag.src = new URL('../assets/brand/onstore-mark.svg', import.meta.url).href;
  bag.alt = '';
  bag.width = 48;
  bag.height = 48;
  const word = element('span', 'commerce-brand-name', 'onStore');
  brand.append(bag, word); // Exactly one brand image: the approved shopping bag.

  const search = element('form', 'commerce-search');
  search.setAttribute('role', 'search');
  const searchLabel = element('label', 'sr-only', 'Search onStore products');
  searchLabel.htmlFor = 'header-product-search';
  const input = element('input');
  input.id = 'header-product-search';
  input.type = 'search';
  input.placeholder = 'Search products, brands and shops';
  input.autocomplete = 'off';
  const submit = element('button', 'commerce-search-submit');
  submit.type = 'submit';
  submit.setAttribute('aria-label', 'Search products');
  submit.append(createIcon('search'));
  search.append(searchLabel, input, submit);
  search.addEventListener('submit', event => {
    event.preventDefault();
    const catalogueSearch = document.querySelector('#product-search');
    if (catalogueSearch) {
      catalogueSearch.value = input.value.trim();
      catalogueSearch.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('#catalogue')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      catalogueSearch.focus({ preventScroll: true });
    } else {
      window.location.href = urlOnHome('#catalogue');
    }
  });

  const actions = element('div', 'commerce-actions');
  const greeting = element('span', 'commerce-greeting', 'Hello, Guest');
  greeting.id = 'onstore-greeting';
  const account = element('details', 'commerce-account');
  const accountButton = element('summary', 'commerce-icon-action');
  accountButton.setAttribute('aria-label', 'Account');
  accountButton.setAttribute('data-tooltip', 'Account');
  accountButton.append(createIcon('user-round'));
  const menu = element('div', 'commerce-account-menu');
  menu.append(element('p', 'commerce-menu-greeting', 'Hello, Guest'));
  const signIn = element('button', 'commerce-menu-action', 'Sign In');
  const register = element('button', 'commerce-menu-action', 'Register');
  signIn.type = register.type = 'button';
  signIn.disabled = register.disabled = true; // No authentication backend yet.
  menu.append(signIn, register, element('p', 'commerce-menu-note', 'Account access will be enabled in a later stage.'));
  account.append(accountButton, menu);
  document.addEventListener('click', e => { if (!account.contains(e.target)) account.open = false; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') account.open = false; });

  const cart = element('button', 'commerce-icon-action commerce-cart');
  cart.type = 'button';
  cart.setAttribute('aria-label', 'Cart, 0 items');
  cart.setAttribute('data-tooltip', 'Cart');
  cart.append(createIcon('shopping-cart'));
  const badge = element('span', 'commerce-cart-count', '0');
  badge.setAttribute('aria-hidden', 'true');
  cart.append(badge);
  const notice = element('div', 'sr-only');
  notice.setAttribute('role', 'status');
  cart.addEventListener('click', () => {
    notice.className = 'commerce-cart-message';
    notice.textContent = 'Cart and checkout simulation are coming in a later stage.';
  });
  const theme = element('button', 'theme-toggle');
  theme.type = 'button';
  bindThemeToggle(theme);
  actions.append(createCurrencyPicker(), greeting, account, cart, theme);
  top.append(brand, search, actions);

  const nav = element('nav', 'commerce-nav');
  nav.setAttribute('aria-label', 'Primary navigation');
  const navInner = element('div', 'commerce-nav-inner shell');
  const categories = element('details', 'commerce-categories');
  const catTrigger = element('summary', 'commerce-categories-trigger');
  catTrigger.append(createIcon('menu'), element('span', '', 'All Categories'));
  categories.append(catTrigger);
  const catLinks = element('div', 'commerce-category-links');
  for (const [name, slug] of [
    ['Properties', 'soko-properties'], ['Electronics', 'click-n-get'],
    ['Vehicles', 'autogiant-motors'], ['Office essentials', 'officetech-solutions'],
    ['Bags', 'joy-totes'], ['Footwear', 'nashaa-kicks'],
    ['Foods & beverages', 'nexagreen']
  ]) {
    const link = element('a', '', name);
    link.href = urlOnHome('#catalogue');
    link.dataset.shopFilter = slug;
    link.addEventListener('click', () => { categories.open = false; });
    catLinks.append(link);
  }
  categories.append(catLinks);
  navInner.append(categories);
  for (const [name, hash] of [
    ['Shops', '#shops'], ['Products', '#catalogue'], ['Featured', '#featured']
  ]) {
    const link = element('a', 'commerce-nav-link', name);
    link.href = urlOnHome(hash);
    navInner.append(link);
  }
  nav.append(navInner);
  site.append(top, nav, notice);
  host.replaceChildren(site);
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
  for (const [title, hash] of [["Shops", "#shops"], ["Catalogue", "#catalogue"], ["About", "#about"]]) {
    const link = document.createElement("a");
    link.href = urlOnHome(hash);
    link.textContent = title;
    nav.append(link);
  }
  inner.append(copyright, nav);
  footer.append(inner);
  host.replaceChildren(footer);
}
