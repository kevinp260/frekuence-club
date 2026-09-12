# Frequency dial navigation review

These captures document the post-Phase-2 navigation refinement. They use the normal empty-event
site state and existing localized content; no real or inferred event was introduced.

| Capture                                                          | State reviewed                                                                       |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [Horizontal desktop, 1440 px](horizontal-desktop-1440.png)       | Four-station neutral dial and separate current-language segmented selector           |
| [Horizontal breakpoint, 1024 px](horizontal-navigation-1024.png) | Active About station and separate selector at the minimum desktop width              |
| [Compact closed, 390 px](compact-closed-390.png)                 | Active compact station with the complete equal-gap scale and both faded outer ticks  |
| [Mobile overlay, 390 px](mobile-overlay-390.png)                 | Four-station vertical dial with Policy active and the selector below it              |
| [Minimum-width overlay, 320 px](mobile-overlay-320.png)          | English dial and selector with no clipped control at the minimum width               |
| [Keyboard focus, 1440 px](keyboard-focus-1440.png)               | Focus ring and label treatment remain distinct from the active Policy station        |
| [Active page, 1440 px](active-page-1440.png)                     | Events station with the single symbolic `7.83 Hz` value                              |
| [No-JavaScript fallback, 390 px](no-javascript-fallback-390.png) | Server-rendered dial and separate language selector remain usable without the script |

Manual review covered equal spacing between every major separator, minor tick, and station; the
empty edge gap plus faded and normal terminal ticks; shared major boundaries; station/label
alignment; the absence of a continuous baseline and long horizontal header chrome; the `Frekuence
Club` spelling; active-frequency placement; focus visibility; line hierarchy; safe-area-aware
overlay spacing; 320 px clipping; page-level overflow; and separation from page content. The
overlay's additional 320 × 480 short-height browser regression confirms internal scrolling and
access to the separate language selector.

Reduced motion has no distinct static appearance worth duplicating here: the same navigation is
rendered with its short transitions removed. These captures intentionally show stable resting
states; the travelling cursor's desktop and mobile mid-movement positions, its homepage origin,
the selector's immediate cursor-free language navigation, and the reduced-motion path are covered
directly by the browser suite.
