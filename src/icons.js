// Single, same-origin SVG sprite; icons inherit currentColor and active CSS theme.
const SPRITE_URL = new URL("../assets/icons.svg", import.meta.url).href;
const NS = "http://www.w3.org/2000/svg";
export function createIcon(name) {
  if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new TypeError("Invalid icon name");
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const use = document.createElementNS(NS, "use");
  use.setAttribute("href", SPRITE_URL + "#" + name);
  svg.append(use);
  return svg;
}
