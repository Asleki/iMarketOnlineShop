# onStore — design-system contract (Stage 1.2)

## Scope
One stylesheet (`assets/site.css`) is authoritative for tokens, themes and shared components. Every page and merchant uses these semantic tokens; **do not create per-shop theme CSS files or copy icon SVGs**.

## Typography
- Body: `var(--font-body)` — Inter if installed, then Segoe UI, Noto Sans and system fallbacks.
- Display: `var(--font-display)` — Manrope if installed, then Avenir Next and system fallbacks.
- Monospace: `var(--font-mono)` for numerical IDs, inventory and timestamps.
- No remotely hosted font CSS or embedded font files yet. Future font import requires an approved asset/license/performance review.
- Fluid heading scale: `--text-h1`, `--text-h2`; readable body line height `--line-body`.

## Semantic palette
| Token | Light | Dark |
| --- | --- | --- |
| `--color-bg` | #F7F9FC | #0B1322 |
| `--color-surface` | #FFFFFF | #17253A |
| `--color-text` | #10223E | #EFF5FF |
| `--color-text-muted` | #536276 | #AFC0D7 |
| `--color-brand` | #175DBF | #8CBCFF |
| `--color-border` | #E4EAF2 | #334762 |
Colors for success, warning, danger, surfaces, accent-contrast, hero, footer and focus are also defined in the CSS.

## Theme semantics
1. OS light/dark is the initial mode.
2. User may toggle explicitly using the shared header control. The chosen mode is stored under `onstore.theme.v1` where storage is permitted.
3. The SVG icons and text always inherit theme colors; never create dark/light image duplicates.
4. Respect reduced-motion preferences, high-contrast focus rings and 44px minimum tap targets for interactive icon buttons.
5. Reserve flash-sale promotional red/orange for real, governed sale events; generic shop branding stays consistent.

## Layout/spacing
- Spacing scale: `--space-1` through `--space-16`.
- Corner radius: `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`.
- Shared CSS classes: `.shell`, `.section`, `.shop-grid`, `.shop-card`, `.button`, `.theme-toggle`, `.icon`.
- Breakpoints reflect layouts; do not copy entire stylesheets into merchant pages.

## Icons
- Source: `assets/icons.svg` (45 symbols).
- Runtime API: `createIcon("search")` in `src/icons.js`.
- Examples: search, cart, account, heart, home, theme, shops, filter, navigation, gallery, category, promo, delivery, payment and contact.
- Decorative icons use `aria-hidden="true"`; their actionable parent control must carry an accessible text/label.
- Original merchant WebP logos are **not icons** and remain intact in `images/logo`.
- All product image fallbacks still use one `images/placeholder.webp`.

## Change policy
Changes to palette, spacing, typography or shared icon definitions belong in this token system, accompanied by accessibility and browser regression checks. Update Stage 1.2 tests when new design-system capabilities become required.
