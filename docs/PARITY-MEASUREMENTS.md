# Measured baseline · 2026-10-28

Produced by `scripts/parity.mjs` inside the pinned browser container at 1440×1000 and 390×844, device scale 1, real fixtures. Full machine-readable output: `.cache/parity/measurements.json` (not committed).

This is **our current rendering**, not the ChatGPT reference. It exists so that any visual change is measurable and so reference comparison can cite concrete numbers instead of impressions.

| Property                       | Desktop 1440                                | Mobile 390             |
| ------------------------------ | ------------------------------------------- | ---------------------- |
| Content column width           | 760 px                                      | 354 px                 |
| Heading                        | 25 px / 650 / lh 31.25 / ls −0.875          | 23 px / 650 / lh 28.75 |
| Body                           | 15 px / lh 24.75 (1.65)                     | 14 px / lh 23.1        |
| Card padding / radius / border | 22 px / 16 px / 1 px `rgb(229,229,229)`     | 18 px / 13 px / 1 px   |
| Card shadow                    | none                                        | none                   |
| Row gap                        | 12 px                                       | 12 px                  |
| Icon                           | 19 px, stroke 1.7, color `rgb(107,107,107)` | same                   |
| Inline code                    | 14.1 px, radius 4 px, padding 2×5           | 13.16 px               |
| Horizontal document overflow   | none                                        | none                   |

## Findings

- **Icons are currently monochrome** (`rgb(107,107,107)` for every row icon). The reference uses semantic colour: muted timestamps, red failure marks, lock/trap warnings. This is a real fidelity gap, being fixed by a semantic `tone` on icons, not arbitrary hex.
- Card uses a 1 px border and no shadow; entity cards use the same construction. The reference's entity rows sit inside one bordered surface with internal separators rather than a shadowed card per item.
- Column width 760 px on desktop matches the reference's reading column closely; mobile 354 px is the 390 px viewport minus 18 px gutters.

## What this does NOT prove

- No reference screenshot was captured at these exact widths in the same browser, so no parity percentage can be derived.
- Fonts are system sans, not the reference's brand font; line-break positions differ even at equal font size.
- The ChatGPT entity panel could not be observed in a successful state (anonymous shared page returned an error), so panel geometry is unverified.
