# Shop branding assets

All filenames use lowercase shop slugs and hyphens:
`images/brands/<slug>/<slug>-<role>.<extension>`.

| Shop | Slug | Identity |
| --- | --- | --- |
| Soko Properties | soko-properties | Original retained |
| Click 'n Get | click-n-get | Original retained |
| AutoGiant Motors | autogiant-motors | Original retained |
| OfficeTech Solutions | officetech-solutions | Original retained |
| Joy Totes | joy-totes | Temporary J initial |
| Nashaa Kicks | nashaa-kicks | Temporary N initial |
| NexaGreen | nexagreen | Approved leaf N; no name inside symbol |

## Roles and formats

- `logo.webp`: four original files renamed without changing a byte; NexaGreen lossless WebP converted from approved transparent PNG.
- `logo.png`: raster export (up to 1024 pixels for legacy artwork). NexaGreen PNG is the exact approved generated image.
- `logo.svg`: traced vector derivative with path geometry, no embedded raster and no external dependencies. Tracing is approximate, especially for photographic AutoGiant and Click 'n Get artwork. Default storefront uses source WebP, not a trace. These derivatives are not claimed as recovered vector originals.
- `initial.svg/png/webp`: temporary initial assets for Joy Totes and Nashaa Kicks, explicitly not approved merchant logos.
- `icon.png/webp`: 512×512 original artwork contained on a neutral white plate. Detailed original logos may not remain legible at very small sizes; no replacement symbol is invented.
- `favicon.ico`: sizes 16, 32, 48, 64, 128 and 256; `apple-touch-icon.png`: 180×180.
- `wordmark-light.svg/png/webp` and `wordmark-dark.svg/png/webp`: separate text-only names for flexible layouts. Vector glyph outlines use Nimbus Sans Bold, a locally available sans-serif companion to the site's Manrope/Inter/system stacks; no font downloads or font files are required. These are navigation labels, not redesigns of historical lettering.
- `social.png`: 1200×630 sharing image with full shop name. NexaGreen caption: Foods & Beverages. Temporary initials stay marked as such in configuration.

All 98 merchant files are inventoried with SHA-256 and byte counts in `data/brand-assets.json`. `data/shops.json` is the authoritative asset mapping.

## Themes and navigation

The original brand colors and the NexaGreen symbol remain unchanged across modes. A shared white `--color-logo-plate` prevents transparent dark details from disappearing on navy. All other card surfaces follow existing theme tokens. No image inversion filters.

`createShopWordmark(shop)` in `src/branding.js` selects separate navy/light wordmark files using shared CSS. The wrapper supplies one accessible name. The homepage keeps the onStore favicon; merchant cards display merchant identities.

Future shop routes should call `applyShopBranding(shop, { canonicalUrl })` at each navigation, including browser history changes. It updates shop title/description, favicon and Apple touch icon. It clears stale social images and sets shop OG/Twitter images when a verified production canonical URL is supplied. Routes do not exist yet; no new shop routes or checkout are implied. Staging stays noindex. Never use a merchant icon as the global onStore favicon.

Existing onStore SVG masters, approved wordmarks, generated PNG/WebP/ICO/social files and homepage/manifest links in `assets/brand/` are preserved unchanged. Merchant filenames use the new standard; the existing shared brand master names remain compatibility references.

## Preservation

Expected original Git blob IDs after rename:

| Slug | Git blob SHA-1 |
| --- | --- |
| soko-properties | 007a098b61bbc8f7950dabda221220aaf3d6fc2f |
| click-n-get | 698df9382462d4b691e89ae3e136d8156bb0bb6e |
| autogiant-motors | cd4eeb06e4d8d8dc8d418671ce284b1b470b8305 |
| officetech-solutions | d9815c344cb7849ff5ca0182adc0464e30a6ba5f |

## Rebuilding

`tools/build-brand-assets.py` regenerates merchant derivatives from committed source assets. It requires Python, Pillow, fontTools, vtracer, Inkscape and `/usr/share/fonts/opentype/urw-base35/NimbusSans-Bold.otf`. Tool versions influence trace output, so intentional rebuilds must refresh and review the checksum manifest. CI verifies committed assets; it does not regenerate them.

## Validation for this update

- Foundation and brand asset contracts pass (`npm test`).
- All raster and ICO files decode; all SVG files parse; multi-size ICO entries and social dimensions are checked.
- Four original Git blob IDs are unchanged, and all merchant assets match SHA-256 manifests.
- Side-by-side light/dark asset compositions were visually inspected.
- Full browser/mobile layout verification remains outstanding: this environment had no Chromium executable and its download failed. No browser test pass is claimed.
