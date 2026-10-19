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
images/placeholder.webp shared fallback only
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
