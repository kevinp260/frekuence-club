# Frekuence Club Website — Phase 1 Implementation Brief

## 1. Purpose of this document

This document preserves the original implementation brief for the first public website of
Frekuence Club. Phase 1 has been implemented, so this is a historical product and design
specification rather than the active repository instruction file. Current agent instructions
are in `../AGENTS.md`; current decisions, unresolved inputs, validation evidence, and deployment
procedures are documented alongside this file.

The original Phase 1 scope excluded the future backend, database, reservations, ticket sales,
worker processes, and custom administration interface. The architecture was required to leave
a clean path for those capabilities without creating unused infrastructure.

If this file is added to an existing repository:

1. Read all repository instructions, including `AGENTS.md`, before changing anything.
2. Inspect the current application, build system, Git state, and existing user changes.
3. Preserve unrelated work and adapt these instructions to the repository where possible.
4. Report a genuine conflict instead of destructively replacing an existing implementation.

Use stable, supported releases available at implementation time. Pin direct dependencies and commit the package lockfile. Do not use experimental framework features unless no stable solution exists and the owner approves the exception.

## 2. Product summary

Frekuence Club is an underground electronic music venue in Tirana, Albania. The brand is built around the idea of **Human Hz**: each person enters as an individual frequency and becomes part of a shared field created by sound, movement, and collective presence.

Confirmed public information:

| Field                   | Value                                                                                                                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name                    | Frekuence Club                                                                                                                                                                                |
| Canonical domain        | `https://frekuence.club`                                                                                                                                                                      |
| Venue type              | Underground electronic music / techno and house club                                                                                                                                          |
| Address                 | Kompleksi Fari, Tiranë, Albania                                                                                                                                                               |
| Coordinates             | `41.3083996, 19.814106`                                                                                                                                                                       |
| Google Maps             | `https://www.google.com/maps/place/Frekuence+Club/@41.3084036,19.8115311,16z/data=!3m1!4b1!4m6!3m5!1s0x135031007e3bb467:0x566bcd33792828ad!8m2!3d41.3083996!4d19.814106!16s%2Fg%2F11ys99ypr5` |
| Instagram               | `https://www.instagram.com/frekuence.club`                                                                                                                                                    |
| Primary language        | Albanian (`sq-AL`)                                                                                                                                                                            |
| Secondary language      | English (`en`)                                                                                                                                                                                |
| Age restriction         | Strictly 18+; physical ID required                                                                                                                                                            |
| Brand phrase            | `Club calibrated at 7.83 Hz`                                                                                                                                                                  |
| Photography policy      | No photos. No videos.                                                                                                                                                                         |
| Current ticket flow     | Admission is approved at the door before the guest pays for entry                                                                                                                             |
| Current reservations    | Not available                                                                                                                                                                                 |
| Current online payments | None                                                                                                                                                                                          |
| Current events          | No upcoming events supplied for publication                                                                                                                                                   |

The uploaded `BrandBook_FREKUENCE_Compressed.pdf` is the visual authority. Do not reinterpret or redesign the logo.

## 3. Phase 1 outcome

Deliver a production-ready, bilingual, static website with these routes:

| Albanian route | English route  | Purpose                                                   |
| -------------- | -------------- | --------------------------------------------------------- |
| `/`            | `/en/`         | Landing page                                              |
| `/events/`     | `/en/events/`  | Event index with a real empty state                       |
| `/policy/`     | `/en/policy/`  | Entry policy and code of conduct                          |
| `/visit/`      | `/en/visit/`   | Address, access, age rule, map, and practical information |
| `/privacy/`    | `/en/privacy/` | Website privacy information                               |
| `/404.html`    | same document  | Branded not-found page with real HTTP 404 behavior        |

Trailing-slash handling must be consistent. Pick one canonical style and configure redirects/canonicals so duplicate URL variants are not indexable. The examples above use trailing slashes.

There must be no dead navigation links. A feature that does not exist must be omitted or shown as non-interactive status text. Do not use `href="#"`, fake buttons, or controls that look clickable but do nothing.

## 4. Explicitly out of scope for Phase 1

Do not add any of the following:

- Django, Django REST Framework, or another backend
- PostgreSQL, Redis, Celery, or worker containers
- Admin authentication or an admin dashboard
- Reservation submission forms
- Guest-list submission forms
- User accounts
- Online payments or GoWild integration
- A contact form
- An embedded Google Map
- An embedded Instagram feed
- Marketing pixels, behavioral tracking, or non-essential cookies
- A cookie-consent banner when no consent-requiring cookies exist
- A CMS
- Autoplay audio
- Autoplay background video
- WebGL, canvas effects, or a heavy animation framework
- Invented events, artists, opening hours, email addresses, phone numbers, testimonials, or claims

Do not create empty services merely to demonstrate the future architecture. The smallest secure Phase 1 deployment is the correct result.

## 5. Required technology

### 5.1 Frontend

- Astro, using a stable supported release
- TypeScript in strict mode
- Static output for all Phase 1 routes
- Astro content collections for future event entries
- Native Astro components and semantic HTML
- Plain CSS with custom properties and scoped component styles
- Avoid React, Vue, Svelte, Tailwind, and client-side state libraries unless a concrete requirement cannot be met cleanly without one
- Prefer CSS and small progressive-enhancement scripts over JavaScript frameworks
- Self-host all fonts and first-party assets

Astro is selected because Phase 1 is content-oriented and should ship mostly HTML and CSS. The future project may enable Astro's Node adapter and on-demand rendering for event routes, but Phase 1 must stay static.

### 5.2 Runtime image

Use a multi-stage Dockerfile:

1. A pinned Node build stage installs dependencies with the lockfile and runs validation/build commands.
2. A pinned unprivileged Nginx runtime image serves only the generated `dist` output.
3. The runtime image must not contain source code, Node, npm caches, the brand book, Git metadata, or development dependencies.

Use an unprivileged runtime listening on a non-privileged container port such as `8080`.

### 5.3 Host topology

The public TLS reverse proxy is the existing Nginx installation on the host. The application itself runs in Docker.

```text
Internet
  -> host Nginx (TLS, canonical redirects, public security headers)
  -> 127.0.0.1:<configured-port>
  -> Docker web container :8080
  -> generated Astro files
```

The Compose port must bind only to loopback, for example:

```yaml
ports:
  - '127.0.0.1:${FREKUENCE_WEB_PORT:-3010}:8080'
```

Do not bind the application container to `0.0.0.0`. Do not make the container port directly accessible from the internet.

## 6. Brand implementation

### 6.1 Core concept

The website must feel like the club's visual system, not like a generic nightlife template or SaaS landing page.

Desired qualities:

- physical, immersive, rhythmic, and controlled
- editorial rather than card-heavy
- dark and architectural
- technically precise but human
- expressive through hierarchy and composition, not decorative clutter
- recognizably connected to sound waves and cymatics

Avoid generic neon gradients, glowing pill buttons, glassmorphism, cyberpunk clichés, waveform stock graphics, and random glitch effects.

### 6.2 Color tokens

Create semantic design tokens rather than scattering raw values throughout components.

Primary approved values from the brand book:

```css
--color-black: #000000;
--color-soft-linen: #efeee8;
--color-pale-slate: #a7a6b4;
--color-signal-red: #ff0101;
--color-white: #ffffff;
```

Additional brand-book tints may be included only as named tokens when actually needed:

```css
--color-linen-light: #f7f7f3;
--color-slate-light: #bab9c5;
--color-slate-dark: #7f7e93;
--color-red-light: #ff3737;
--color-red-lighter: #ff6d6d;
--color-gray-dark: #404040;
--color-gray: #808080;
```

Accessibility constraints:

- `#ff0101` on black is acceptable for ordinary text, but still use it intentionally.
- `#ff0101` on white or soft linen is not suitable for normal-sized body copy. Reserve it for large display text, borders, icons, or decorative signals.
- `#404040` on black is not readable text.
- Never communicate state through color alone.
- Every final foreground/background pairing must meet WCAG 2.2 AA contrast requirements for its actual size and weight.

### 6.3 Typography

- Use Montserrat for Phase 1 headings and body text.
- Self-host WOFF2 files from the official open-source Montserrat distribution.
- Include only the weights actually used.
- Preload only the most important above-the-fold font file.
- Use `font-display: swap`.
- Provide a robust system sans-serif fallback stack.
- Do not download or extract font files from the PDF.

The brand book specifies Proxima Nova Hebrew for secondary and body text, but an approved self-hosting licence has not yet been confirmed. Do not ship it until the owner supplies licensed files and licence terms. Record this in the project TODO document.

### 6.4 Logo and visual assets

Original SVG assets are not yet available.

Rules:

- Never redraw, trace, simplify, animate, distort, recolor, rotate, outline, add effects to, or rearrange the logo.
- A temporary high-resolution transparent export taken directly from the supplied brand book may be used for development.
- Preserve the approved black and white monochrome usage.
- Do not use a red logo unless that exact variation is present and approved in the brand book.
- Keep required clear space around every logo variation.
- Do not use the brand-book PDF itself as a browser asset.
- Keep temporary exports in a clearly named location such as `src/assets/brand/temporary/`.
- Add a nearby README explaining the source and replacement requirement.

Create `docs/BRAND_ASSET_TODOS.md` containing at least:

- obtain horizontal, vertical, emblem, and symbol SVGs
- obtain light/dark logo variants
- obtain favicon/source icon files
- obtain approved cymatic pattern SVGs
- obtain approved monoline icon set
- obtain licensed body-font files or approve Montserrat-only typography
- obtain approved venue and crowd photography with usage rights
- confirm whether amber/yellow is photography-only or an approved UI color
- replace every temporary export and remove the temporary directory

The absence of original assets must not cause the agent to invent replacements.

### 6.5 Photography

When approved photography becomes available, follow the brand direction:

- motion blur, grain, haze, high contrast, and physical movement
- monochrome or red-dominant treatment
- concrete, metal, lighting systems, people, and collective energy
- human presence without turning the website into a gallery of identifiable guests

Until approved photos are supplied, use restrained typographic compositions and approved/extracted brand patterns. Do not use stock nightclub photography or AI-generated crowd images.

### 6.6 Motion

Motion should suggest frequency and resonance rather than spectacle.

- Prefer slow CSS/SVG transforms, opacity changes, or pattern drift.
- Motion must not interfere with reading or controls.
- Do not create flashing or strobing effects.
- Do not animate red/white full-screen transitions.
- Honor `prefers-reduced-motion: reduce` by disabling all non-essential movement.
- Provide a static first frame and keep all content available without JavaScript.
- Avoid pointer effects on touch devices and weak hardware.

## 7. Information architecture and page requirements

### 7.1 Global header

Required elements:

- approved logo/wordmark treatment
- Events
- Policy
- Visit
- Albanian/English language switch
- visible keyboard focus states

Do not add a Reservations navigation item in Phase 1.

The mobile menu must:

- use a real button with an accessible name and expanded state
- be fully keyboard operable
- close with Escape and after navigation
- manage focus predictably
- not trap the user when JavaScript fails

### 7.2 Landing page

Use this content order unless visual testing proves a small change is necessary:

#### A. Hero

Required content:

- Frekuence Club identity
- `Human Hz`
- `Nën një far, në një bodrum.` / `Under a lighthouse, in a basement.`
- `Club calibrated at 7.83 Hz`
- a visible `18+` indicator
- links to Events and Visit

Do not add a reservation CTA. Do not add a splash-screen age gate. A modal that merely asks visitors to confirm their age does not verify age and harms accessibility and discovery.

#### B. Events preview

The full section and event-card system must exist even though the collection is empty.

Albanian empty state:

> Frekuenca e radhës do të shpallet së shpejti.

English empty state:

> The next frequency will be announced soon.

Include an ordinary external link to Instagram. Do not imply that Instagram is an event reservation channel unless the owner later confirms that.

Show a non-interactive availability label where appropriate:

- Albanian: `Rezervimet - së shpejti`
- English: `Reservations - coming soon`

This must not be styled as an enabled or disabled button.

#### C. Manifesto

Summarize the Human Hz concept from the brand book. Keep the copy concise. Do not copy long passages from the PDF into the site.

The section should communicate:

- every guest enters as an individual frequency
- music is experienced physically, not passively
- the dance floor becomes a shared field
- presence and collective energy matter more than performance or documentation

#### D. Policy preview

Present concise, highly legible signals:

- 18+ and physical ID required
- respect and consent
- zero tolerance for discrimination, harassment, violence, or aggressive conduct
- no photos and no videos
- entry remains subject to the door team's decision

Link to the complete Policy page.

#### E. Visit preview

Include:

- `Kompleksi Fari, Tiranë`
- a normal external link to the supplied Google Maps location
- `Orari publikohet për çdo event.` / `Opening times are published for each event.`
- Instagram link

Do not show blank phone, email, or hours fields.

### 7.3 Events page

The page must render a designed empty state when no published event entries exist. It must not be a 404, a blank grid, or placeholder poster.

Implement an Astro content collection schema now so real event data can be added without redesigning the page. Recommended fields:

```text
slug
title
summary
description
startsAt
endsAt
doorsAt (optional)
timezone (default Europe/Tirane)
lineup[]
poster
posterAlt
status: scheduled | postponed | cancelled | sold_out | past
ticketMode: door_only | external | internal_future
externalTicketUrl (optional)
reservationsAvailable (default false)
featured (default false)
draft (default true)
seoTitle (optional)
seoDescription (optional)
```

Requirements:

- Validate dates and required fields at build time.
- Do not publish entries marked `draft`.
- Never show an external ticket action without a valid allowlisted HTTPS URL.
- Use the `Europe/Tirane` timezone and render localized dates.
- Prepare components for event status changes without implementing backend logic.
- When event detail pages are introduced, give every event a stable canonical URL and valid Event JSON-LD.

### 7.4 Policy page

This is the venue entry policy and code of conduct, not the website privacy policy.

Use owner-approved final wording before production launch. The structure must cover:

1. 18+ admission and physical ID requirement
2. door selection and non-guaranteed entry
3. reservation/guest-list status not guaranteeing admission
4. entry payment occurring only after admission is approved under the current process
5. respect, consent, and awareness of shared space
6. zero tolerance for discrimination, harassment, violence, intimidation, and aggressive behavior
7. no photography and no video recording
8. staff instructions and removal from the venue when rules are broken
9. accessibility/contact route for policy questions once contact details exist

Use a professional formulation such as:

> Entry is subject to the door team's discretion. A reservation or guest-list registration does not guarantee admission. Entry may be declined when staff reasonably believe that a guest's conduct could compromise the safety, respect, or atmosphere of the venue.

Do not publish informal language such as “bad vibe.” Do not express or imply discriminatory selection criteria.

### 7.5 Visit page

Required:

- venue name and correct address
- coordinates in structured data
- external Google Maps link
- 18+ and ID notice
- event-dependent opening-hours notice
- no-photography notice
- Instagram link
- reservation-coming-soon status

Add placeholders in source data for future official email, phone, accessibility information, transport guidance, and opening hours, but omit unavailable fields from rendered HTML.

### 7.6 Privacy page

The Phase 1 site has no form, accounts, analytics, embedded map, embedded social feed, or non-essential cookies. The privacy page must still accurately describe relevant processing, including ordinary web-server access logs if the host keeps them.

Before production, the owner must supply or approve:

- legal identity/contact of the site operator
- what host and application logs contain
- purposes and legal basis
- retention period
- recipient/hosting information where required
- user rights and contact process
- explanation that clicking Maps or Instagram leaves the website and is governed by the third party

Do not invent legal-controller details. Do not claim “we collect no data” if server logs contain IP addresses or request metadata. Mark unresolved legal fields clearly in source and block a production-ready signoff until they are resolved.

### 7.7 Footer

Required links:

- Events
- Policy
- Visit
- Privacy
- Instagram
- language switch

Include `18+` and the copyright year. Do not include Terms or Cookies until those pages are genuinely required and available.

## 8. Internationalization

Albanian is the default language at the root. English lives under `/en/`.

Requirements:

- Set accurate `lang="sq-AL"` and `lang="en"` attributes.
- Every translatable page must have a one-to-one language counterpart.
- Include reciprocal `hreflang="sq-AL"` and `hreflang="en"` links.
- Include an `x-default` link to the Albanian version.
- Canonical URLs must point to the same-language canonical page, not always to the root language.
- The language switch must preserve the equivalent route where possible.
- Do not automatically redirect by browser language or IP.
- Keep translation content in typed, centralized data rather than duplicating markup.
- Albanian copy must use correct characters and natural wording, not ASCII substitutions.
- Dates must be localized while retaining the `Europe/Tirane` timezone.

## 9. SEO and discoverability

SEO is a product requirement, not an afterthought. The implementation must provide clean technical foundations without promising rankings.

### 9.1 Metadata

Every indexable page requires unique localized:

- `<title>`
- meta description
- canonical URL
- Open Graph title, description, URL, image, locale, site name, and type
- Twitter/X card metadata where an appropriate image exists
- language alternates

Do not repeat one generic title/description across all pages. Keep titles natural and location-aware without keyword stuffing.

Suggested homepage themes:

- Albanian: underground electronic music club in Tirana
- English: underground techno and house club in Tirana, Albania

### 9.2 Structured data

Add JSON-LD for the venue using the most specific accurate Schema.org type, `NightClub`, with `LocalBusiness` semantics. Include only confirmed information:

- name
- canonical URL
- description
- address locality/country
- geo coordinates
- Maps URL
- Instagram under `sameAs`
- logo/image only when a production asset exists

Do not invent telephone, price range, reviews, ratings, or opening hours.

When real event detail pages are added, emit one valid Event object per event using visible page information. Do not add fake structured data to the empty Events page.

### 9.3 Indexing files

Required:

- generated sitemap containing every canonical, indexable language route
- `robots.txt` referencing the sitemap
- correct canonical host `https://frekuence.club`
- no staging or localhost URLs in production output
- branded 404 page served with HTTP 404
- no accidental `noindex` in production
- explicit `noindex` support for non-production environments

### 9.4 Local SEO launch tasks

Document but do not attempt account actions:

- verify the site in Google Search Console
- submit the sitemap
- claim/verify the Google Business Profile
- keep venue name, address, coordinates, and URL consistent across Google, Instagram, Resident Advisor, Facebook, TripAdvisor, and future event platforms
- add the website URL to official social/business profiles
- validate LocalBusiness and Event structured data

Create `docs/SEO_LAUNCH_CHECKLIST.md` covering these manual tasks.

## 10. Accessibility requirements

Target WCAG 2.2 AA.

Mandatory requirements:

- semantic landmarks and correct heading hierarchy
- one clear page-level `h1`
- skip-to-content link
- complete keyboard navigation
- visible focus that is not removed by CSS
- logical focus order
- accessible mobile-navigation semantics
- descriptive link labels
- alt text based on image purpose; decorative assets use empty alt text
- text contrast appropriate to its actual size and weight
- controls with adequate target size
- no information conveyed by color alone
- no auto-playing sound
- no strobe/flashing effects
- reduced-motion support
- layout functional at 320 CSS pixels wide and at 200% zoom
- no horizontal scrolling for ordinary page content
- language attributes on document and language changes where needed
- form accessibility standards applied later, even though Phase 1 has no forms

Do not hide primary information inside animation, hover-only states, or imagery.

## 11. Performance requirements

The site must remain lightweight despite the visual direction.

- Prefer zero client JavaScript for static sections.
- Set Astro to avoid inline production styles where necessary for a strict CSP.
- Optimize images during build and emit appropriate dimensions, `srcset`, and `sizes`.
- Prefer AVIF/WebP with a compatible fallback when source quality allows.
- Never lazy-load the primary LCP image; lazy-load below-the-fold imagery.
- Preload only genuinely critical fonts/assets.
- Use long-lived immutable caching for fingerprinted assets.
- Keep HTML cache policy compatible with safe deployments and rollback.
- Avoid layout shifts by reserving media dimensions.
- No third-party scripts in Phase 1.

Production targets under a normal mobile Lighthouse run:

| Category       | Target                       |
| -------------- | ---------------------------- |
| Performance    | 90 or higher                 |
| Accessibility  | 95 or higher                 |
| Best Practices | 95 or higher                 |
| SEO            | 95 or higher                 |
| LCP            | under 2.5 seconds            |
| CLS            | under 0.1                    |
| INP            | under 200 ms when measurable |

Treat these as release gates unless the agent documents a reproducible environmental exception.

## 12. Phase 1 security requirements

Although Phase 1 is static, apply a strict security baseline.

### 12.1 Secrets and configuration

- No secrets are needed by the browser or static build.
- Never put secrets in `PUBLIC_*` variables, Astro source, Docker build arguments, images, Compose files, or Git.
- Commit `.env.example` only if a non-secret deployment variable is actually required.
- Ignore all real `.env*` files except explicitly safe examples.
- Ensure the brand-book source PDF is not copied into the runtime image or public `dist` directory.
- Generate and inspect the production output for accidental paths, credentials, source maps, and development URLs.

### 12.2 Public HTTP headers

The host Nginx is the owner of public TLS redirects and public security headers. Provide a reviewed example at `deploy/nginx/frekuence.club.conf.example`; do not overwrite the user's actual host configuration.

The public response should implement, as compatible with the final build:

- strict Content Security Policy
- `Strict-Transport-Security` after HTTPS is verified
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` disabling unused powerful features
- `frame-ancestors 'none'` in CSP
- `object-src 'none'`
- `base-uri 'self'`
- `form-action 'self'`
- an appropriate cross-origin opener policy

Start from a CSP equivalent to:

```text
default-src 'self';
base-uri 'self';
object-src 'none';
frame-ancestors 'none';
form-action 'self';
img-src 'self' data:;
font-src 'self';
style-src 'self';
script-src 'self';
connect-src 'self';
frame-src 'none';
upgrade-insecure-requests
```

Do not weaken the policy with `unsafe-eval`. Avoid `unsafe-inline` by emitting external CSS/JavaScript and avoiding inline handlers. If production Astro output or required JSON-LD conflicts with the intended policy, resolve it deliberately and document the narrowest safe exception. Do not silently disable CSP to make the site work.

### 12.3 Dependency and image hygiene

- Pin direct dependencies and commit the lockfile.
- Use `npm ci` in CI and Docker builds.
- Run dependency auditing and address actionable high/critical production issues.
- Pin Docker base images to explicit maintained versions; use digests in production if the repository's update workflow supports safe automated refreshes.
- Keep the runtime image minimal and unprivileged.
- Do not ship package managers, shells, compilers, or build caches when the selected runtime permits their removal.
- Add automated dependency update configuration if the repository supports it.

## 13. Docker and deployment deliverables

Create:

- `Dockerfile`
- `.dockerignore`
- `compose.yaml`
- container Nginx configuration
- `deploy/nginx/frekuence.club.conf.example`
- `docs/DEPLOYMENT.md`
- a lightweight `/healthz` response inside the container

Compose requirements:

- exactly one application service in Phase 1 unless an existing repository has a justified auxiliary service
- loopback-only port publication
- health check
- restart policy appropriate to a long-running web service
- `no-new-privileges`
- drop Linux capabilities where compatible
- read-only filesystem where practical, with explicit tmpfs mounts for required Nginx runtime paths
- no host Docker socket mount
- no privileged mode
- no broad host filesystem mounts
- no secrets in Compose

Container Nginx requirements:

- serve actual files and directory indexes with correct static-site routing
- return real 404 responses
- expose `/healthz`
- immutable caching for fingerprinted assets
- conservative caching for HTML
- correct MIME types
- compression where appropriate
- no directory listing
- no server-version exposure where configurable

Host Nginx example requirements:

- redirect HTTP to HTTPS
- redirect `www.frekuence.club` to the apex if `www` DNS exists
- proxy only to the configured loopback port
- forward the original host and protocol safely
- reject unrecognized hostnames through the server's existing default-host policy
- set security headers once without conflicting duplicates
- allow certificate paths and application port to remain explicit placeholders

Document deployment and rollback without destructive commands. A normal update should build a new immutable image, start it, verify health, and only then complete the switch. Document how to return to the last known-good image/tag.

## 14. Repository structure

Use a clear structure similar to:

```text
src/
  assets/
    brand/
      temporary/
  components/
  content/
    events/
  data/
  layouts/
  pages/
    en/
      events/
      index.astro
      policy.astro
      privacy.astro
      visit.astro
    events/
    index.astro
    policy.astro
    privacy.astro
    visit.astro
  styles/
public/
  favicons/
docs/
  BRAND_ASSET_TODOS.md
  CONTENT_TODOS.md
  DEPLOYMENT.md
  SEO_LAUNCH_CHECKLIST.md
deploy/
  nginx/
tests/
```

Adapt to Astro conventions and existing project structure rather than forcing empty directories.

Centralize confirmed venue data and translations. Avoid copying the address, coordinates, links, and brand phrase into many templates.

## 15. Content TODO handling

Create `docs/CONTENT_TODOS.md` with unresolved owner inputs:

- final Albanian and English manifesto copy
- owner-approved complete entry policy
- legal site-operator identity for Privacy
- access-log contents and retention for Privacy
- official email and phone
- accessibility details for the venue
- transport/parking guidance if desired
- opening schedule or confirmation that all hours remain event-specific
- approved venue photography
- future reservation rules and required personal information

Rules for missing content:

- Do not render empty labels.
- Do not show lorem ipsum in a production build.
- Use concise, truthful copy derived only from confirmed information.
- Mark legally incomplete content in source documentation.
- A local preview may use clearly identified draft copy, but the production-readiness report must flag every unresolved legal or factual field.

## 16. Testing and quality assurance

Provide repeatable scripts for linting, type checking, building, tests, and production validation.

Minimum checks:

### 16.1 Static and unit checks

- Astro diagnostics/type check
- formatting/linting
- content-collection schema validation
- translation key parity
- unique metadata per route
- canonical and hreflang reciprocity
- no draft events in production output
- no placeholder URLs or `href="#"`
- no broken internal links

### 16.2 Browser tests

Use Playwright or an equivalent maintained tool for smoke tests covering:

- all Albanian and English routes return successfully
- unknown route returns 404
- language switch maps to the equivalent page
- navigation works with keyboard
- mobile menu behavior
- skip link
- external links use safe `rel` values when opening a new tab
- reduced-motion mode
- 320 px mobile layout
- representative mobile, tablet, and desktop viewports
- no unexpected horizontal overflow
- no console errors

Run automated accessibility testing with axe or an equivalent tool and supplement it with manual keyboard/focus review.

### 16.3 SEO validation

- inspect generated HTML, not only browser DOM
- validate titles, descriptions, canonicals, and language alternates
- validate NightClub/LocalBusiness JSON-LD
- validate sitemap and robots output
- verify that English pages are not canonicalized to Albanian pages
- verify no fake Event structured data on the empty Events page

### 16.4 Container validation

- build with a clean Docker cache path where practical
- run Compose and wait for the health check
- curl every route through the published loopback port
- confirm correct status for 404
- confirm content types and cache headers
- inspect final image history/files for source, PDF, `.env`, and secret leakage
- verify the service is not bound publicly

### 16.5 Visual review

Capture and review full-page screenshots at minimum:

- `390 x 844`
- `768 x 1024`
- `1440 x 1000`

Review all language variants and verify:

- visual hierarchy
- logo clear space
- no clipping or overlap
- readable type over patterns/images
- consistent section rhythm
- correct mobile menu
- stable empty-event state
- focus visibility
- no accidental generic template styling

## 17. Definition of done for Phase 1

Phase 1 is complete only when:

1. All required Albanian and English routes exist.
2. There are no dead links or fake interactions.
3. The event system renders a polished empty state and has a validated content schema.
4. The design follows the brand book without altering the logo.
5. Temporary brand assets are explicitly isolated and documented.
6. The website is usable with keyboard, reduced motion, small screens, and zoom.
7. Metadata, canonicals, hreflang, sitemap, robots, and venue JSON-LD are correct.
8. The production build contains no source PDF, secrets, source maps, dev URLs, or placeholder event data.
9. The Docker runtime is unprivileged, healthy, minimal, and loopback-bound.
10. Host Nginx and deployment examples are supplied but do not overwrite server files.
11. Automated checks and browser smoke tests pass.
12. Visual screenshots have been inspected and defects corrected.
13. Lighthouse targets are met or a reproducible exception is documented.
14. Remaining brand, content, and legal inputs are recorded in TODO documents.
15. The final handoff lists exact validation commands and any remaining blockers.

## 18. Future architecture - guidance only

This section informs design boundaries. Do not implement it in Phase 1.

### 18.1 Expected services

When dynamic functionality is approved, expand the containerized system to:

- Astro frontend, using static and on-demand rendered routes as appropriate
- Django and Django REST Framework API
- Django Admin for initial staff management
- PostgreSQL
- Redis only when caching, rate limiting, or queues require it
- Celery worker only when genuine background tasks exist
- Celery Beat or another scheduler only when scheduled tasks exist
- durable media/object storage and backup process

The host Nginx remains the TLS entry point. Prefer same-origin routing:

```text
/          -> frontend
/api/      -> Django API
/staff/    -> Django Admin or protected staff application
```

Same-origin routing reduces CORS and cookie complexity. Do not expose PostgreSQL or Redis ports publicly.

### 18.2 Authentication and authorization

- Start with Django Admin and server-side Django sessions for staff.
- Do not introduce JWT solely because an API exists.
- Cookies must be `Secure`, `HttpOnly`, and appropriately `SameSite`.
- Keep CSRF protection enabled for cookie-authenticated unsafe requests.
- Require MFA for privileged staff accounts when backend administration launches.
- Apply login throttling and alerting without locking out the entire venue operation.
- Use least privilege and explicit staff roles.
- Audit privileged changes to events, guest lists, admission decisions, and ticket state.

For every private endpoint:

- derive the acting identity from the verified request/session (`request.user`)
- never trust `user_id`, `owner_id`, `created_by`, role, price, approval, or organization ownership supplied by the client
- reject or ignore ownership fields in input serializers
- scope database queries to objects the authenticated actor may access
- enforce object-level authorization on every read and write
- return generic not-found/forbidden responses that do not expose private object existence unnecessarily

Authentication does not replace authorization.

### 18.3 Events

The future Event model should support:

- stable slug and immutable internal ID
- localized title/description
- start/end/door times with timezone
- lineup and artist ordering
- draft/published lifecycle
- scheduled/postponed/cancelled/sold-out/past states
- poster/media metadata
- capacity when applicable
- ticket mode and pricing snapshots
- SEO metadata
- created/updated/published actor and timestamps

Publishing should be transactional and auditable. Public pages must not expose drafts.

### 18.4 Reservations and guest lists

Model reservations as a lifecycle, not a Boolean:

```text
submitted -> reviewed -> listed -> checked_at_door -> admitted | declined | no_show | cancelled
```

Exact states may change after business review.

Security and correctness requirements:

- rate-limit and bot-protect public submission
- validate every field server-side
- minimize collected personal data
- use database constraints and transactions for capacity/concurrency
- require idempotency for retryable creation operations
- use unpredictable public references
- never place personal data directly in QR codes
- protect exports and staff search endpoints
- record admission decisions and staff actor without exposing internal notes publicly
- make guest-list placement explicitly non-guaranteeing of admission
- define retention and deletion policies before collection begins

### 18.5 Media uploads

When staff can upload posters:

- allowlist file types and validate actual file signatures
- set strict size and dimension limits
- generate random storage names
- never trust original filenames or paths
- strip metadata when appropriate
- process images away from request handlers
- serve uploads as inert content from a separate media origin or safe object storage policy
- prevent SVG/script upload unless a secure sanitization pipeline is explicitly approved
- back up original and processed media according to documented retention

### 18.6 Payments and tickets

No payment system exists in Phase 1. If direct ticket sales are later approved:

- use a reputable hosted checkout
- never collect or store raw card data
- create immutable order/price snapshots
- use server-created payment sessions
- verify webhook signatures against the raw body
- reject replayed/expired webhook events
- make webhook processing idempotent
- treat the payment provider's confirmed server event as authoritative, not the browser redirect
- reconcile payments, refunds, and ticket issuance
- use opaque signed ticket/QR identifiers with revocation and single-use scanning controls
- define refund behavior for denied entry before selling online
- log sensitive actions without logging payment secrets or excessive personal data

### 18.7 Operations

Before backend launch:

- run Django's production deployment checks
- keep `DEBUG` disabled
- load secrets at runtime from protected environment/secret files
- configure exact allowed hosts and trusted origins
- set secure proxy/HTTPS settings correctly for host Nginx
- configure structured logs with secret/PII redaction
- add error monitoring and uptime checks
- back up PostgreSQL and media
- encrypt backups, control access, and define retention
- test restoration, not only backup creation
- document migrations, deploy order, health checks, and rollback
- keep all internal services on private Docker networks

## 19. Agent execution sequence

Follow this order:

1. Inspect repository instructions and current state.
2. Record assumptions and conflicts.
3. Scaffold or adapt the Astro TypeScript project.
4. Establish typed venue data, translations, design tokens, and global layout.
5. Prepare temporary brand assets without redrawing them.
6. Implement page structure and shared components.
7. Implement the event content collection and empty state.
8. Add metadata, JSON-LD, sitemap, robots, favicons, and 404 behavior.
9. Add accessibility and reduced-motion behavior.
10. Build Docker/runtime/Compose configuration.
11. Add host Nginx and deployment documentation.
12. Add automated tests and validation scripts.
13. Run all checks and start the container.
14. Perform browser and screenshot review at required viewports.
15. Fix discovered defects.
16. Produce a concise handoff with commands, decisions, screenshots, and unresolved TODOs.

Do not stop after generating code. Verification and visual review are part of implementation.

## 20. Reference standards

Use current official guidance during implementation:

- Astro Docker guidance: <https://docs.astro.build/en/recipes/docker/>
- Astro on-demand rendering for the future phase: <https://docs.astro.build/en/guides/on-demand-rendering/>
- Google SEO Starter Guide: <https://developers.google.com/search/docs/fundamentals/seo-starter-guide>
- Google LocalBusiness structured data: <https://developers.google.com/search/docs/appearance/structured-data/local-business>
- Google Event structured data: <https://developers.google.com/search/docs/appearance/structured-data/event>
- Google localized-page guidance: <https://developers.google.com/search/docs/specialty/international/localized-versions>
- Django deployment checklist: <https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/>
- Django security overview: <https://docs.djangoproject.com/en/5.2/topics/security/>
- OWASP REST Security Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html>
- OWASP Authentication Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html>
- OWASP Content Security Policy Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html>

When a referenced version has become unsupported, use the current stable official documentation and note the change in the handoff.
