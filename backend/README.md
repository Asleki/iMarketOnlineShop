# onStore testing backend

This server runs the approved marketplace testing flows. It is a local persistent testing system, not a deployed production payment or merchant service. Requires Node.js 22.13+; no third-party runtime dependencies.

```sh
npm start
# Open http://127.0.0.1:3000
```

The server serves the frontend and `/api/marketplace/` from the same origin. `PORT`, `HOST` and `ONSTORE_DB_PATH` configure the runtime. By default it binds to localhost and stores SQLite under `backend/data/`; that directory, SQLite files and environment secrets are ignored by Git. Bind `HOST=0.0.0.0` only where an authorized preview/ingress is available. GitHub Pages can browse static products but cannot execute this backend or sign users in.

## Data and boundaries

The first run imports the existing 210-product catalogue, seed prices and simulated stock into SQLite. Property designs remain references with no sellable quantity. Seed offers retain their original absolute deadlines, including expired sales. Restarting preserves product publication dates, admin edits, accounts, reviews and carts. Publication time means first import into this testing store; future real product publication should supply audited merchant dates. Open backend-powered pages refresh offer/stock data every 30 seconds and on returning to the tab; countdowns expire against the server deadline every second.

Accounts use scrypt password hashes, case-insensitive unique email/username, random revocable seven-day HttpOnly/SameSite=Lax session cookies, JSON-only mutation requests, same-origin checks and authentication rate limits. Use HTTPS and `COOKIE_SECURE=true` behind a trusted production ingress. Email verification, password recovery, payments and checkout are intentionally not implemented yet; there are no confirmation-email claims or fake completed orders. Never use real customer/payment data during testing. Cart additions do not reserve or decrement inventory; stock is revalidated whenever a cart quantity changes. Future checkout must reserve stock transactionally.

The application serves only an allowlist of storefront files; backend source, databases, secrets and Git metadata are not public routes. Reviews and contact messages are stored as text. There are no default administrator credentials and no public account promotion endpoint.

## Shop-managed offers and stock

An operator can provision a test shop administrator locally:

```sh
# Set ONSTORE_ADMIN_PASSWORD privately in your shell; do not commit it.
node backend/cli.mjs create-admin shopmanager manager@example.test click-n-get
```

Sign in using the normal profile page, then follow **Manage shop** to `admin.html`. That user can create/edit only its shop's offers and stock and read messages sent to that shop. Flash sales require an absolute start/end time; UTC deadlines are validated server-side. Public merchant signup, merchant subscriptions, a separate admin domain and admin onboarding remain deferred.

## Membership rules for testing

Starter begins at level 0 and 0 points. Bronze: 100, Silver: 500, Gold: 1,500, Diamond: 5,000. Browsing earns one point per full active minute, capped at 30 minutes per UTC day. Heartbeats only accrue recent intervals of 30–90 seconds; a single credit is capped at 60 seconds and the server shares timestamps across tabs. The browser pauses credit while hidden or idle. One unique product review earns five points; editing it does not award more. One point per completed USD spent is reserved for future verified paid orders; no current endpoint can alter spending or membership points. These thresholds are a documented testing policy for later review.

## Validation and migration

`npm run test:backend` runs isolated temporary-database integration tests. `npm test` includes the full storefront suite. Browser journeys cover homepage onboarding, dedicated product pages, gallery, cart, profile, shops and shop-owned offers. Test records must never be committed.

For the later private onStore/GCP repo, keep API contracts and frontend URLs stable while replacing SQLite with a managed database and deploying the Node service behind HTTPS. Production work still needs verified merchant data, email delivery/recovery, abuse controls, backups, observability, durable multi-instance storage, real checkout and payments. No GCP resources are provisioned by this testing implementation.
