# Parity with the ChatGPT reference

Measured against the two shared conversations and the product screenshots in this session. Status is **evidence-based**: "done" means a scenario is reproduced by our renderer and covered by a test, not that it looks identical.

## How parity is measured

No single percentage. Three independent measures:

1. **Scenario coverage** — how many reference scenarios we can reproduce end to end. Reported as `covered / total`, each with a test or a recorded manual check.
2. **Visual deviation list** — concrete, itemised differences (spacing, typography, panel geometry) with severity. Empty list means "not reviewed", not "identical".
3. **Interaction coverage** — keyboard, focus, mobile behaviour, local state, failure states. Counted by scenario, not by clicks.

Reference screenshots and our captures are compared at the same viewport width; goldens in tests are regression baselines only and never proof of fidelity.

## Scenario matrix

| Reference scenario | Status | Evidence / gap |
|---|---|---|
| Technical explanation with icon rows, inline code, divider | Covered | `technical` fixture; light+dark screenshots; axe clean |
| Movie collection with rows, posters, detail panel, gallery, related entity | Covered | `films`; browser test opens panel, switches photo, follows related, restores focus |
| Marketplace listing: meta strip, price, specs, green highlight badge | Covered | `listing`; meta + badge nodes, schema tests |
| Local calculator with instant recompute | Covered | `calculator`; browser test asserts value and reset |
| Reactive configurator: input, switch, tabs, conditional sections | Covered | `configurator`; browser test |
| Segmented control, radio, checkbox, date input | Covered | schema + renderer tests |
| Popover, tooltip, image lightbox | Covered | primitives; 8 browser checks desktop+mobile |
| **Streaming**: components appear while the model is still writing | Missing | adapter waits for settled JSON; planned |
| **Same-turn repair**: invalid fence returns diagnostics to the model in the same turn | Missing | no host hook yet; planned |
| **Panel that reflows the conversation column** | Partial | drawer overlays; host layout integration open |
| Citations attached to prose | Partial | sources live in the entity panel, not inline |
| Inline entity chip inside a sentence | Partial | only block-level `entity-ref` |
| Sortable / filterable tables | Missing | static table only |
| Charts: axes, tooltips, series legend | Partial | simple SVG chart, no hover/tooltip |
| Code highlighting | Missing | plain `<pre>` |
| Math (KaTeX) | Missing | not implemented |
| Writing artifact / editable document | Missing | not implemented |
| Maps | Missing | no provider |
| Video / audio playback | Missing | images only |
| Persistent panel / canvas across turns | Missing | not implemented |
| Mini-apps with isolated runtime | Missing | deliberately out of scope for now |

Coverage: **12 / 21** scenarios, 3 partial, 6 missing.

## Visual deviations (known, not yet fixed)

| # | Deviation | Severity |
|---|---|---|
| 1 | Desktop drawer overlays instead of reflowing the column | S2 |
| 2 | Typography and rhythm are our own, not the host's native scale | S2 |
| 3 | Chart is hand-drawn SVG without tooltips or axis units | S3 |
| 4 | Tables have no sorting/filtering affordance | S2 |
| 5 | No code syntax highlighting | S3 |
| 6 | Entity panel success geometry never observed in the reference (anonymous share errored) | Unknown |

## What we are not measuring

- No claim of pixel parity: we have no access to the reference's fonts, tokens or component internals.
- Automated diffs compare our build to our own goldens; they cannot say "closer to ChatGPT".
- Perceived quality needs a human look at side-by-side captures; that is a review step, not a test.

## Backlog derived from this matrix

Ordered by effect on daily use:

1. Streaming render (partial, inert) — the biggest perceived-quality gap.
2. Panel that participates in host layout instead of covering content.
3. Table sorting/filtering, chart tooltips and units.
4. Inline entity chips and citations inside prose.
5. Code highlighting, math, media nodes.
6. Same-turn validation feedback, then a validator tool only if failure rates justify it.
