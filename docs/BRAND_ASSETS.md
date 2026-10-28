# onStore — seven approved merchant branding assets

The approved merchant identities were selected by a human and released as one governed package. All seven shops have exactly **14** image and vector files under `images/brands/<slug>/`. The only live asset paths are listed in `data/brand-assets.json` and `data/shops.json`.

Shop names: Soko Properties (Modern Horizon), Click 'n Get (PowerClick), AutoGiant Motors (GiantVelocity), OfficeTech Solutions (OrbitTech), Joy Totes (Modern JT), Nashaa Kicks (Sprint NK), and NexaGreen (NexaLeaf).

## Complete fourteen-file contract per merchant

- `<slug>-logo.png` — PNG full logo
- `<slug>-logo.webp` — website full logo; `shop.logoUrl`
- `<slug>-logo.svg` — path-based traced SVG derivative (not native source vector)
- `<slug>-icon.png` and `<slug>-icon.webp` — square brand mark
- `<slug>-favicon.ico` — six icon sizes (16, 32, 48, 64, 128, 256)
- `<slug>-apple-touch-icon.png` — 180 × 180
- `<slug>-social.png` — 1200 × 630
- `<slug>-wordmark-light.png`, `.webp`, `.svg`
- `<slug>-wordmark-dark.png`, `.webp`, `.svg`

**No temporary merchant initials are shipped**. Joy Totes and Nashaa Kicks are now mapped to their approved logo WebPs. The main onStore global mark and favicon in `assets/brand/` are intentionally unchanged.

## Validation and provenance

Run `npm test` and `python3 tools/build-brand-assets.py` to validate that all 98 assets match the manifest, shop mappings resolve, SVGs are self-contained, icons and social dimensions are correct, and no obsolete merchant placeholder exists. `tools/build-brand-assets.py` is verification-only to avoid regenerating or overwriting human-approved assets.

Raster logo masters and vectorized SVGs are derivatives of human-selected designs; SVG tracing does not imply exact native vector geometry. Audit source: 2026-10-28 `IMARKET-BRANDKIT-STD-001`. Additional real-browser tests remain necessary before claiming live visual qualification. Git history retains legacy blobs but the **HEAD** tree does not.
