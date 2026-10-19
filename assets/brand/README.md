# Approved onStore brand assets

## Source approvals
- `onstore-mark.svg`: vector trace of the user's approved onStore blue shopping bag logo (uploaded PNG source `444870.png`).
- `onstore-wordmark-on-dark.svg`: vector trace of the user's approved white/blue onStore wordmark (source `444869.png`).
- `onstore-wordmark-on-light.svg`: a dark-navy text-color adaptation of the same wordmark for white/light surfaces.
- `nexagreen-mark.svg`: vector trace of the user's approved green N-leaf mark (source `444966.png`).

The traced paths simplify anti-aliasing and gradients; the exact PNG sources remain in the user conversation. This is a derivative vector, **not** a pixel-identical copy or AI-redrawn alternative. All backgrounds are transparent.

## Generated formats
Run `python assets/brand/build-assets.py`. Outputs include 32–512px PNG/WebP sizes, a multi-resolution favicon ICO, and 1200×630 social preview. Do not hand-edit generated files; rebuild from the approved SVG masters. Other shop original WebP logos remain under `images/logo/` unchanged.
