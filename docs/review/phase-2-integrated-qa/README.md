# Phase 2 integrated QA visual evidence

These captures are checkpoint 8 review evidence. They use only the unmistakably synthetic event
responses from `scripts/mock-events-api.mjs` and Playwright's non-production poster interception;
they do not publish or infer a real event.

- `homepage-events-320.png` verifies the event-led homepage at the minimum supported width.
- `event-deck-keyboard-focus-1440.png` records the visible keyboard-focus/action state.
- `event-deck-touch-selected-390.png` records the explicit mobile card-selection state.
- `event-deck-no-javascript-390.png` is intended to record the readable linked-list fallback
  without JavaScript. The capture test now refuses to write this evidence until at least one
  intercepted synthetic poster exists and every deck poster has decoded successfully.

Reproduce all checkpoint visual captures with:

```sh
npm run test:visual
```

The full suite also regenerates the existing 1440, 1024, 390, and 320 px route captures under the
ignored `screenshots/` directory and the previously committed checkpoint 6 captures. Manual review
on 2026-09-11 found no page-level horizontal overflow, clipped primary content, overlapping
controls, illegible event metadata, hidden focus, or hover-only access. The selected touch card
uses a real labelled button and exposes a separate event link; the no-JavaScript layout keeps all
event links visible. The 2026-09-11 review follow-up environment did not have Chrome and could not
download it through the environment proxy, so the no-JavaScript PNG still requires regeneration
by the next Chrome-capable visual run; it is not claimed as refreshed evidence here.
