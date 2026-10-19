# onStore — SEO and head metadata contract

## Working rebuild branch
- Head includes UTF-8, viewport, title, description, `lang="en"`, color-scheme and theme-color.
- Open Graph `og:type`, `og:site_name`, title/description, Twitter summary card/title/description.
- Favicon links to approved `assets/brand/onstore-mark.svg` and `assets/brand/onstore-favicon.ico`; identity manifest icons point at generated 192px and 512px PNGs.
- This working branch is intentionally marked `noindex, nofollow` until there is an approved, deployed production website. Do not accidentally index an empty shopping prototype.
- A URL-less share description is preferable to a fabricated social image, company location or production hostname.

## Production acceptance gate
1. Verify actual production HTTPS domain and whether it redirects consistently.
2. Set canonical URLs and `og:url` using the verified public production base. Do not set them to the GitHub repository, preview hostname or an invented domain.
3. Switch to `index, follow` **only** on production when links, catalogue images, descriptions, and product pages are functional.
4. Generate sitemap.xml and robots.txt at the production host root; GitHub project-path hosting does not provide a substitute for domain-root robots.txt.
5. Distinct descriptive title, description, canonical, headings and structured data per real shop/product page. Use `src/seo.js` rather than hand-copying head boilerplate.
6. Prepare one approved raster 1200 × 630 Open Graph image and the required deployment metadata. SVG favicon is not an Open Graph thumbnail.
7. If adding JSON-LD Product/Offer or ratings, populate only source-backed canonical product IDs, actual merchant simulation context and verified media; never infer availability, real prices or reviews.
8. Accessibility: one H1, semantic landmarks, descriptive product image alt text, functional link targets and adequate contrast.

## Disallowed shortcuts
- Claiming real payments, business contact availability or deliveries before implemented.
- Fake customer reviews or invented third-party review aggregates.
- Duplicate head metadata pasted into each shop page.
- Staging URLs in canonical metadata or a mock production hostname.
