# onStore — storefront rebuild

**Status:** Stage 1 cleanup candidate. This branch prepares the shared architecture before the homepage, flash-sale timer and NoveGeo v015 catalogue are integrated.

The project is being rebuilt inside `Asleki/iMarketOnlineShop` while preserving six original merchant names:

- Soko Properties
- Click 'n Get
- AutoGiant Motors
- OfficeTech Solutions
- Joy Totes
- Nashaa Kicks

## Minimal project structure

```text
index.html             single homepage document
assets/site.css        single global token/layout/component stylesheet
src/app.js             homepage entrypoint
src/shared.js          reusable header and footer
src/media.js           one image fallback for future NoveGeo media
data/shops.json        single source for six shop names / categories
images/placeholder.webp shared product fallback
images/logo/*.webp    four original, verified shop-logo blobs
tests/validate-foundation.mjs
docs/REBUILD_STAGES.md
```

No per-shop HTML/CSS copies. Shop-specific appearance will be data-driven, not duplicated files.

## Run locally

Serve over HTTP; opening `index.html` using `file://` will block `fetch()` in many browsers.

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Node.js is only required for tests:

```sh
npm test
```

## Historical recovery

Source baseline on `main`: `b96cfafb6e6a7b6c4d726edd1605ff37f2d77e84`.

The cleanup is intentionally confined to the `rebuild/stage-01-clean-foundation` branch. Legacy files and images remain recoverable in Git history at the baseline commit.

Source of future product records and validated media: NoveGeo v015. See `docs/REBUILD_STAGES.md` for media exclusions, shop allocation and release gates.

## Merchant-logo preservation

The rebuilt shop cards reuse four unchanged WebP logos recovered from the old `main` commit (Soko Properties, Click 'n Get, AutoGiant Motors, OfficeTech Solutions). Joy Totes and Nashaa Kicks did not have committed source-logo files; they temporarily show their shop initials instead of a misleading substitute. Logo links are defined in `data/shops.json`.

## Shared design system (Stage 1.2)

- `assets/site.css` is the **only CSS file**: named semantic color tokens, typographic scales, spacing, borders, shadows, responsive components, light/dark themes and reduced-motion handling.
- `src/theme.js` binds one accessible toggle in the shared header. It respects OS preference until a user manually selects light or dark; a setting is saved under `onstore.theme.v1` when storage is available.
- `assets/icons.svg` defines 45 reusable monochrome line icons. Create with `src/icons.js` to inherit theme color; avoid per-shop icon copies.
- `assets/favicon.svg` is a simple onStore shopping-bag brand mark, not a substitute for merchant logos.
- `site.webmanifest` provides identity metadata only. No service worker or installable PWA claim.
- `src/seo.js` centralizes future page metadata updates; the incomplete branch is marked `noindex, nofollow`. Domain-specific canonical URLs, sitemap, rich results and social preview image are explicitly deferred until verified.
- Font stacks prefer Inter for body and Manrope for headings when already available on the device. No external font downloads or font files are bundled; system fallbacks always work.

See `docs/DESIGN_SYSTEM.md` and `docs/SEO_CONTRACT.md`.

## Foundation CI

The `.github/workflows/foundation.yml` workflow runs the Node foundation contract, JavaScript syntax checks and SVG syntax checks on rebuild branch pushes and pull requests to `main`. No build package or third-party runtime is required.
