# onStore rebuild stages — working contract

Source repository: `Asleki/iMarketOnlineShop`.
This branch is a cleanup/rebuild candidate, **not the public production release**.

## Stage 1 — clean foundation (this branch)
- Preserve original `main` and Git history; never force-push or replace the source baseline.
- Retain the six original shop names and add NexaGreen (Foods and Beverages only) in `data/shops.json`, normalizing URL slugs.
- Remove obsolete HTML/CSS/JS and nonessential product media from the branch; retain `images/placeholder.webp` plus four source-backed original shop-logo WebP images from the legacy commit.
- New foundational files: one `index.html`, one `assets/site.css`, shared header/footer in `src/shared.js`, one `src/app.js` entry point, shared media helper, seven-shop config and automated foundation test.
- No claims of operational checkout, stock, shop contact endpoints or verified promotions at this stage.

## Stage 2 — homepage (next)
- Build a high-quality responsive homepage and robust flash-sale countdown.
- Use a configured absolute UTC expiry. Refreshing or reopening must not reset the countdown.
- Sale eligibility and discounts must be evaluated against the actual deadline; avoid misleading fake countdowns.
- No dead hero, product, category or seller links.

## Stage 3 — NoveGeo v015 catalogue (210 listings)
- Select 30 products each for Soko Properties, Click 'n Get, AutoGiant Motors, OfficeTech Solutions, Joy Totes, Nashaa Kicks and NexaGreen.
- NexaGreen accepts Foods and Beverages only; exclude all other product categories.
- Preserve authoritative NCP IDs, brands, media roles and descriptions. The shop listing model is separate from the canonical product.
- Joy Totes: first 30 approved Umoja IDs from the 114 direct-fit selection; zero real photos currently registered for this set.
- Use **one** shared image fallback. Never invent media records.
- Properties: exclude architect/planner media from consumer galleries. Foods: exclude recipe instruction/images.
- Prices, stock, discounts and delivery times are merchant simulation data, never inferred as facts from NoveGeo.

## Stage 4 — shopping flows
- Unified search, facets, product detail and accessible gallery, a single cart/wishlist model.
- Simulated checkout and order-tracking contracts, with clear no-real-payment disclosure.

## Stage 5 — qualification and release
- Product-to-media manifest checks, link checks, mobile accessibility, search/cart/checkout/browser tests.
- Deploy or merge only after approval and verified checks.

## Governance
- No destructive changes to the original `main` branch.
- The existing repo's assets are preserved in Git history at the source commit.
- The NoveGeo Source of Truth stays outside the website; only a verified curated export is allowed inside the site.
- Subsequent image additions update the media manifest without changing the product's canonical ID.

## Original shop-logo retention (Stage 1 correction)
- Preserve the former originals in Git history; current storefront assets are the newly approved designs, each recorded in the 98-item SHA-256 manifest.
- Logo mappings live in `data/shops.json` and share the same reusable shop-card component.
- Joy Totes Modern JT and Nashaa Kicks Sprint NK now use approved `logo.webp` files; obsolete placeholder files are excluded from the working tree.
- NexaGreen uses the approved leaf N WebP in `images/brands/nexagreen/`; its text wordmark is separate. The existing shared brand SVG is preserved for compatibility.
- Do not confuse the product-image placeholder with a merchant logo or invent a logo.

## Stage 1.2 — design token and head metadata contract
- Shared semantic light/dark tokens in the single `assets/site.css`.
- One SVG icon sprite and reusable `createIcon` helper; a shared theme switch with persistent preference and OS-default behavior.
- Favicon SVG and manifest identity; SEO/OG/Twitter head fields; staging remains `noindex` without fabricated domain canonical URLs or product rich results.
- The seven shop identities use approved 2026-10-28 replacements; the historical originals remain retrievable in Git history.
- The flash-sale countdown and all shopping features remain in their approved later stages.

## Stage 1.3 — approved brand logos on the default branch
- onStore shopping bag is the primary logo; user-approved wordmark is the secondary wordmark, with light/dark SVG variants.
- NexaGreen's approved N-leaf mark is now its shop logo. No unrelated photos and no invented wordmark.
- Main-branch cleanup preserves the prior main snapshot on `archive/pre-onstore-main-2026-10-19` and in Git ancestry; no history rewrite.
- A deterministic GitHub Actions workflow produces the PNG/WebP/ICO variants; production readiness requires successful workflow verification.

## Merchant asset completion

Standardized merchant paths, all seven approved logos, 98 SHA-256-verified format derivatives, and metadata helpers are documented in `BRAND_ASSETS.md`. Shared onStore global brand masters and generated files remain unchanged.
