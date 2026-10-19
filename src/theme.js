// Light/dark preferences are shared by every page; system preference is the default.
import { createIcon } from "./icons.js";
const KEY = "onstore.theme.v1";
const systemTheme = window.matchMedia?.("(prefers-color-scheme: dark)");
let explicit = null;
try {
  const saved = window.localStorage.getItem(KEY);
  if (saved === "light" || saved === "dark") explicit = saved;
} catch { /* Browser storage can be unavailable, e.g. private contexts. */ }

const resolve = () => explicit ?? (systemTheme?.matches ? "dark" : "light");
export function bindThemeToggle(button) {
  function apply() {
    const mode = resolve();
    document.documentElement.dataset.theme = mode;
    button.setAttribute("aria-label", "Dark theme");
    button.setAttribute("title", mode === "dark" ? "Switch to light theme" : "Switch to dark theme");
    button.setAttribute("aria-pressed", String(mode === "dark"));
    button.replaceChildren(createIcon(mode === "dark" ? "sun" : "moon"));
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = mode === "dark" ? "#0b1322" : "#f7f9fc";
  }
  button.addEventListener("click", () => {
    explicit = resolve() === "dark" ? "light" : "dark";
    try { window.localStorage.setItem(KEY, explicit); } catch { /* Functional in-memory fallback. */ }
    apply();
  });
  if (systemTheme?.addEventListener) systemTheme.addEventListener("change", () => { if (explicit === null) apply(); });
  apply();
}
