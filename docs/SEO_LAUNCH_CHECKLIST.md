# SEO launch checklist

## Repository-validated implementation

Checkpoint 8's synthetic integrated evidence covers localized canonicals and reciprocal
hreflang, event Open Graph/Twitter metadata, truthful `MusicEvent` JSON-LD, a published-only
dynamic `/sitemap.xml`, real event/route 404 responses, and 95-or-higher accessibility,
best-practice, and SEO Lighthouse budgets. See
[the validation report](VALIDATION_REPORT.md#phase-2-checkpoint-8-integrated-qa-validation).

That evidence does not validate the real public domain, search-engine accounts, real event data,
or third-party caches. Complete the following only after the canonical production deployment and
owner-approved content are available.

## Operator-run production verification

- verify `https://frekuence.club` in Google Search Console
- fetch and inspect `https://frekuence.club/sitemap.xml`, then submit that exact URL in Search
  Console
- claim or verify the Google Business Profile
- add the canonical website URL to official social and business profiles
- keep the venue name, address, coordinates, and URL consistent across Google, Instagram,
  Resident Advisor, Facebook, TripAdvisor, and future event platforms
- validate the visible `NightClub` structured data with Google's Rich Results Test and the
  Schema.org validator on the production URL
- validate each approved event's visible `MusicEvent` structured data before publication
- confirm the apex redirect, optional `www` redirect, trailing slashes, canonicals, and
  reciprocal language alternates on the public host
- confirm that staging builds set `PUBLIC_NOINDEX=true` and that production does not
- inspect venue and approved event Open Graph images in major sharing debuggers
- confirm unknown and intentionally unpublished event URLs return a real public 404
- monitor sitemap processing, crawl errors, and real 404 responses after launch

No account, DNS, TLS, public-domain, or search-engine verification is automated or claimed by this
repository. Production launch responsibilities and unresolved content are summarized in
[the Phase 2 handoff](PHASE_2_HANDOFF.md#production-signoff).
