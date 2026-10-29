# onStore — marketplace testing

**Status:** Working marketplace testing frontend and Node.js/SQLite backend. Includes category onboarding, offers, dedicated product pages, shops, customer profiles, carts, reviews and scoped shop administration. Payments, checkout, merchant registration/billing and the future private GCP deployment remain deferred.

Run `npm start` with Node.js 22.13+ and open `http://127.0.0.1:3000`. Accounts and server-managed data persist in the ignored `backend/data/` directory. Read [backend/README.md](backend/README.md) for configuration, test-admin provisioning, membership rules and data limitations. Do not use real customer data in this testing stage.

GitHub Pages provides static browsing and guest preferences/cart only. It cannot run the backend or customer account services. All approved branding, catalogue source files and media remain unchanged.

The project is being rebuilt inside `Asleki/iMarketOnlineShop` with seven shops, preserving the six original merchants and adding NexaGreen:

- Soko Properties
- Click 'n Get
- AutoGiant Motors
- OfficeTech Solutions
- Joy Totes
- Nashaa Kicks
- NexaGreen — Foods and Beverages only

## Minimal project structure

```text
index.html             single homepage document
assets/site.css        single global token/layout/component stylesheet
src/app.js             homepage entrypoint
src/shared.js          reusable header and footer
src/media.js           one image fallback for future NoveGeo media
data/shops.json        single source for seven shop names / categories
images/placeholder.webp shared product fallback
images/brands/<slug>/ standardized merchant assets
tests/validate-foundation.mjs
docs/REBUILD_STAGES.md
```

No per-shop HTML/CSS copies. Shop-specific appearance will be data-driven, not duplicated files.

## Run locally

```sh
npm start
# http://127.0.0.1:3000
npm test
```

The frontend and `/api/marketplace/` API run on the same origin. Use `PORT`, `HOST`, `ONSTORE_DB_PATH` and (behind HTTPS) `COOKIE_SECURE` to configure the test service. Databases and credentials are excluded from source control.

Browser integration tests require Python Playwright and Chromium:

```sh
python3 scripts/test-marketplace-browser.py
```

The browser script starts an isolated temporary backend, provisions a temporary shop administrator and cleans up its database after the journeys. Screenshots default to `/tmp/onstore-browser-evidence`.

## Historical recovery

Source baseline on `main`: `b96cfafb6e6a7b6c4d726edd1605ff37f2d77e84`.

The original website is preserved in Git history and on `archive/pre-onstore-main-2026-10-19`. The branded foundation is on main; this merchant-assets update is prepared on the rebuild branch.

Source of future product records and validated media: NoveGeo v015. See `docs/REBUILD_STAGES.md` for media exclusions, shop allocation and release gates.

## Merchant-logo preservation

All seven shop cards use human-selected, approved full-logo WebP images. Joy Totes and Nashaa Kicks use permanent Modern JT and Sprint NK artwork, not placeholder symbols. The complete 98-asset inventory is in `data/brand-assets.json`; shop mappings are in `data/shops.json`.

## Shared design system (Stage 1.2)

- `assets/site.css` is the **only CSS file**: named semantic color tokens, typographic scales, spacing, borders, shadows, responsive components, light/dark themes and reduced-motion handling.
- `src/theme.js` binds one accessible toggle in the shared header. It respects OS preference until a user manually selects light or dark; a setting is saved under `onstore.theme.v1` when storage is available.
- `assets/icons.svg` defines 45 reusable monochrome line icons. Create with `src/icons.js` to inherit theme color; avoid per-shop icon copies.
- `assets/brand/onstore-mark.svg` is the approved shopping-bag brand logo and favicon master; PNG/ICO variants are generated beside it.
- `site.webmanifest` provides identity metadata only. No service worker or installable PWA claim.
- `src/seo.js` centralizes future page metadata updates; the incomplete branch is marked `noindex, nofollow`. Domain-specific canonical URLs, sitemap, rich results and social preview image are explicitly deferred until verified.
- Font stacks prefer Inter for body and Manrope for headings when already available on the device. No external font downloads or font files are bundled; system fallbacks always work.

See `docs/DESIGN_SYSTEM.md` and `docs/SEO_CONTRACT.md`.

## Foundation CI

The `.github/workflows/foundation.yml` workflow runs the Node foundation contract, JavaScript syntax checks and SVG syntax checks on rebuild branch pushes and pull requests to `main`. No build package or third-party runtime is required.

## Approved branding
- onStore **main logo**: approved navy/blue shopping bag with integrated white “on” monogram; source `assets/brand/onstore-mark.svg`.
- onStore **wordmark**: approved “onStore” letterform, adapted into `onstore-wordmark-on-light.svg` and `onstore-wordmark-on-dark.svg`.
- NexaGreen **merchant logo**: approved NexaLeaf identity at `images/brands/nexagreen/nexagreen-logo.webp`, mapped through `data/shops.json`. The shared `assets/brand/nexagreen-mark.svg` remains unchanged.
- All seven merchant shop brands now use newly approved logos, with independent hashes and a 14-file-per-shop contract.
- The SVGs are compact **vector traces based on user-approved source PNGs**; production PNG, WebP, ICO and 1200×630 assets are generated by `assets/brand/build-assets.py` in the brand-assets workflow.
- The original uncleaned repository snapshot is preserved at `archive/pre-onstore-main-2026-10-19`; Git history remains intact. The default `main` is the clean branded site with generated PNG, WebP, ICO and social-preview image variants.

## Merchant assets

All seven shops have new human-approved logo assets with standardized PNG/WebP/SVG files, six-size ICO favicons, light/dark wordmarks and 1200×630 social images. All 98 files have a SHA-256 record in `data/brand-assets.json`. See `docs/BRAND_ASSETS.md` for verified format roles, provenance, theme behavior and integration.


## Local Stage 2: 210-product catalogue preview

Products render from `api/v1/catalogue.json` and `media/images/*.webp`; 30 canonical records per shop. Search/filter, product details and galleries are available from the homepage. Joy Totes uses the approved placeholder exception. No live pricing, stock, property location or sale authorization is asserted. Run `npm test`, then preview through an HTTP server (not `file://`).
