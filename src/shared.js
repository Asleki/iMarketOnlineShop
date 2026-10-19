// Shared site chrome. Future routes/pages import the same components.
export function renderHeader(host) {
  const header = document.createElement("header");
  header.className = "site-header";
  const inner = document.createElement("div");
  inner.className = "shell header-inner";
  const brand = document.createElement("a");
  brand.className = "brand";
  brand.href = "./index.html";
  brand.setAttribute("aria-label", "onStore home");
  brand.append(document.createTextNode("on"));
  const brandAccent = document.createElement("span");
  brandAccent.textContent = "Store";
  brand.append(brandAccent);
  const nav = document.createElement("nav");
  nav.className = "site-nav";
  nav.setAttribute("aria-label", "Main navigation");
  for (const [title, target] of [["Shops", "#shops"], ["About", "#about"]]) {
    const link = document.createElement("a");
    link.href = target;
    link.textContent = title;
    nav.append(link);
  }
  inner.append(brand, nav);
  header.append(inner);
  host.replaceChildren(header);
}

export function renderFooter(host) {
  const footer = document.createElement("footer");
  footer.className = "site-footer";
  const inner = document.createElement("div");
  inner.className = "shell footer-inner";
  const copyright = document.createElement("p");
  copyright.textContent = "© onStore — Shop names retained from the original marketplace.";
  const nav = document.createElement("nav");
  nav.setAttribute("aria-label", "Footer navigation");
  for (const [title, target] of [["Shops", "#shops"], ["About", "#about"]]) {
    const link = document.createElement("a");
    link.href = target;
    link.textContent = title;
    nav.append(link);
  }
  inner.append(copyright, nav);
  footer.append(inner);
  host.replaceChildren(footer);
}
