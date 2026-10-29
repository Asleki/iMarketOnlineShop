# Marketplace Testing Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this approved plan task-by-task.

**Goal:** Build the approved marketplace customer journeys and persistent local testing backend.

**Architecture:** Keep the existing plain JavaScript frontend and shared CSS. A same-origin Node HTTP server serves public files and a SQLite-backed API; a client adapter supports static catalogue browsing without fabricating backend features.

**Tech Stack:** Node >=22.13, node:sqlite, node:crypto, node:test, browser ES modules, Playwright/Chromium for validation.

**Spec:** `docs/superpowers/specs/2026-10-29-marketplace-testing.md`

## Global Constraints

- Preserve approved header appearance, homepage hero and all approved brand/media bytes.
- Backend lives under `backend/`; no database files or secrets in Git.
- Payment, checkout, merchant registration/billing and GCP migration remain deferred.
- Normal commits and pushes only; existing user history remains intact.

## Review Focus

- Cross-account profile/cart/review isolation and cross-shop offer mutations must be denied.
- Expired deadlines, stale stock and fractional/negative quantities must not create valid offers/cart entries.
- Category selection must persist, require five valid unique categories and preserve preference order.
- Deep links, empty collections, image fallbacks, mobile navigation and unknown product/shop IDs must work.
- Auth and server-only data must never be simulated by the static fallback or exposed as static files.

### Task 1: Persistent testing service

Files: `backend/{database,auth,marketplace,server}.mjs`, `backend/cli.mjs`, `backend/tests/api.test.mjs`, `backend/README.md`.

Interfaces: `createApplication({dbPath, root, clock})` returns `{server, db, close}`; JSON API prefix `/api/marketplace/`. Auth uses email/username and HttpOnly session cookie. Catalogue payload contains canonical products, departments, rates, shops, stock, publication time and active offers.

- [x] Write integration tests for accounts, persisted sessions/preferences, stock/cart bounds, reviews, timed offers, administrator scope and protected files. Run `node --test backend/tests/*.test.mjs`, expecting failures before implementation.
- [x] Implement SQLite schema, validated APIs, static allowlist and local admin provisioning.
- [x] Run integration tests until all pass; document startup, test data and migration boundaries.

### Task 2: Marketplace pages

Files: `src/{market-api,market-ui,preferences,marketplace,profile,product-page}.js`, updated `src/{app,shared,catalogue-ui}.js`, root page documents, `assets/site.css` additions.

Interfaces: common canonical product links and cards; persisted guest/account preferences; common header/footer; collection pages consume the same catalogue adapter as homepage/shop/detail/search.

- [x] Define browser journeys for first-visit five-category modal, canonical product/gallery/review/cart flow, profile sign-in, shops and offers.
- [x] Implement pages and UI modules with textContent for untrusted text, working error/empty states and unchanged approved hero.
- [x] Update contracts that explicitly depend on replaced product modal/home shops grid; retain asset, currency and hero algorithm checks.

### Task 3: Integration and publication

- [x] Run full backend/frontend tests, syntax checks and desktop/mobile browser journeys; verify persistence after restart and static fallback.
- [x] Request one independent final review, resolve material findings and record validation.
- [ ] Commit/push normally, verify CI/static deployment, start the backend locally and clearly report backend hosting limitations.
