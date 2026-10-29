# Marketplace testing delivery — 2026-10-29

Base: `a99905d2b58faf2fddcb0bd5b5e173b495ef0422`. This implements the approved testing architecture; the future private onStore repository and GCP deployment are separate work.

## Delivered flows

- First-homepage-visit modal requires five unique categories, preserves choice order, and saves preferences locally or in the signed-in account. Homepage uses the first five and provides editing.
- The approved header appearance and homepage hero are preserved. The homepage shops grid is replaced by separate hot-deals, new-arrivals and flash-sales carousels with collection pages.
- Shared product pages use canonical IDs from every entry point: cards, search, related products and the hero. They provide gallery/thumbnails, descriptions, stock, cart actions and review totals with the latest three reviews.
- Dedicated shops and data-driven individual shop pages share global navigation/footer, approved logos and shields. Shop pages provide their own hero/navigation, category filter, offers and trending products. Shop offer collection links retain shop scope.
- Profiles support registration, email/username login, logout, saved address, category editing and server-calculated level-zero membership. Passwords are hashed; session tokens are revocable and HttpOnly.
- Guest carts merge into an account on login. Server validates stock and isolates accounts. Property design references do not receive fabricated sellable quantities.
- Locally provisioned shop admins can manage only their shop's offers and stock. Flash deadlines are stored UTC instants and survive refresh. Data refreshes every 30 seconds; expiry is checked every second. New-arrival publication time is persisted once at first import.
- Contact forms save messages to the testing database; shop admins can see their shop's inbox. No email-delivery claim is made.

## Verification

- `npm test`: passed all existing applicable asset/catalogue/hero/currency/commerce suites, four marketplace model/storage tests, and ten backend integration test cases including the parent suite.
- `python3 scripts/test-marketplace-browser.py`: desktop/mobile journeys passed with zero page JavaScript errors. Includes onboarding persistence, gallery navigation, guest-cart merge, signup/login/logout, saved address, reviews, shops/search, scoped shop deals, a real admin-set flash deadline across refresh, stock updates, out-of-stock controls and cart subtotal consistency after expiry.
- Static browsing was tested under a GitHub Pages-style `/iMarketOnlineShop/` subpath, including canonical links, guest cart and account-service unavailability. No local password/authentication simulation is used.
- `node --check` passed for frontend, backend and test modules. `git diff --check` passed.
- Approved global/merchant brand assets, all source catalogue/media files and `src/hero.js` remain byte-for-byte unchanged.
- An independent review identified a concurrent activity-credit race. An overlapping, partial-body HTTP regression reproduced excess credit (1,870 versus the 1,800-second daily cap); resolving identity after body parsing and an atomic re-read/check/update fixed it. The regression now passes. The shop hot-deals navigation finding was also fixed and browser-tested. No known review blockers remain.

## How to test

Use Node.js 22.13+ and run `npm start`; open `http://127.0.0.1:3000` on the machine running the server. See `backend/README.md` for database paths, HTTPS cookie settings, local admin provisioning and membership rules. Database files, credentials and runtime accounts must stay out of Git.

GitHub Pages is a frontend-only preview; `_config.yml` excludes server/tooling folders from the published website. It cannot run customer accounts or administer live stock/offers. The same-origin Node server is required for full testing. No public backend hosting or GCP resources are created by this change.

Payments, checkout, default payment methods, public merchant onboarding/billing, a separate admin domain, production email verification/recovery, GCP migration and physical-device acceptance testing remain deferred. Mobile QA here used real Chromium with mobile emulation. Initial inventory/prices/offers are imported testing data, not verified production merchant state. Existing expired flash sales remain expired rather than receiving invented deadlines.
