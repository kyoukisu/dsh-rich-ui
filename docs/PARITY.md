# Parity with the ChatGPT reference

Measured against the two shared conversations and the product screenshots in this session. Status is **evidence-based**: "covered" means a scenario is reproduced by the renderer and guarded by a test, not that it looks identical.

## How parity is measured

No single percentage. Three independent measures:

1. **Scenario coverage** — how many reference scenarios we can reproduce end to end, each with a test or a recorded manual check.
2. **Visual deviation list** — concrete, itemised differences (spacing, typography, panel geometry) with severity.
3. **Interaction coverage** — keyboard, focus, mobile behaviour, local state, failure states.

Reference screenshots and our captures are compared at the same viewport width; goldens in tests are regression baselines only and never proof of fidelity.

## Scenario matrix

| Reference scenario                                                    | Status  | Evidence / gap                                                                    |
| --------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------- |
| Technical explanation with icon rows, inline code, divider            | Covered | `technical`; light+dark screenshots; axe clean                                    |
| Movie collection with rows, posters, detail panel, gallery, related   | Covered | `films`; browser test opens panel, switches photo, follows related, restores focus |
| Marketplace listing: meta strip, price, highlight badge               | Covered | `listing`; meta + badge nodes, schema tests                                       |
| Local calculator with instant recompute                               | Covered | `calculator`; browser test asserts value and reset                                |
| Reactive configurator: input, switch, tabs, conditional sections      | Covered | `configurator`; browser test                                                      |
| Segmented control, radio, checkbox, date input                        | Covered | schema + renderer tests                                                           |
| Popover, tooltip, image lightbox                                      | Covered | primitives; 8 browser checks desktop+mobile                                       |
| Streaming: completed components appear while the model writes         | Covered | prefix scanner; inert preview until the block settles                             |
| Sortable tables                                                       | Covered | `dashboard`; header click reorders rows and sets `aria-sort`                      |
| KPI cards with a change indicator                                     | Covered | `stat`; bold number, signed delta, semantic tone                                  |
| Charts with axes, units, series legend and hover readout              | Covered | `dashboard`; multi-series line, tooltip, hidden data table for screen readers     |
| Process / architecture flow                                           | Covered | `diagram`; ordered steps, connector labels, mobile reflow                         |
| Syntax highlighting with copy                                         | Covered | `technical`; tokenizer for js/ts, Go, Python, shell, SQL, JSON, CSS                |
| Support-matrix style table                                            | Covered | `table` inside `card`                                                             |
| Same-turn repair: invalid fence returns diagnostics to the model      | Missing | no host hook; invalid blocks stay as code                                         |
| Panel that reflows the conversation column                            | Partial | the lab reflows; the DSH adapter overlays a fixed drawer                          |
| Citations attached to prose                                           | Partial | sources live in the entity panel, not inline                                      |
| Inline entity chip inside a sentence                                  | Partial | only block-level `entity-ref`                                                     |
| Filterable tables                                                     | Covered | `dashboard`; local substring filter, visible count and a no-results row           |
| Scatter plot                                                          | Missing | bar, line, area and donut only                                                    |
| Mermaid / ER / sequence diagrams                                      | Missing | `diagram` is an ordered flow, not a graph layout engine                           |
| Math (KaTeX)                                                          | Missing | not implemented                                                                    |
| Writing artifact / editable document                                  | Missing | not implemented                                                                    |
| Maps                                                                  | Missing | no provider                                                                        |
| Video / audio playback                                                | Missing | images only                                                                        |
| Persistent panel / canvas across turns                                 | Missing | not implemented                                                                    |
| Mini-apps with isolated runtime                                       | Missing | deliberately out of scope                                                          |

Coverage: **15 / 27** scenarios covered, **3 partial**, **9 missing**.

## Visual deviations (known, not yet fixed)

| #   | Deviation                                                                                   | Severity |
| --- | ------------------------------------------------------------------------------------------- | -------- |
| 1   | Desktop drawer overlays the conversation inside DSH instead of reflowing the column         | S2       |
| 2   | Typography follows the host font but uses our own scale and rhythm                          | S2       |
| 3   | Entity row posters use a fixed 2:3 crop: good for film posters, tight for product photos    | S3       |
| 4   | Wide tables scroll horizontally on a phone; the demo four-column table now fits             | S3       |
| 5   | Chart omits scatter plots and custom series styling                                         | S3       |
| 6   | Entity panel success geometry was never observed in the reference (anonymous share errored) | Unknown  |

## What we are not measuring

- No claim of pixel parity: we have no access to the reference's fonts, tokens or component internals.
- Automated diffs compare our build to our own goldens; they cannot say "closer to ChatGPT".
- Perceived quality needs a human look at side-by-side captures; that is a review step, not a test.

## Backlog derived from this matrix

Ordered by effect on daily use:

1. Same-turn validation feedback, so a rejected block can be repaired without a second user message.
2. Panel that participates in host layout instead of covering content.
3. Inline citations and entity chips inside prose.
4. Scatter and richer chart options.
5. Math, media nodes, artifacts and maps.
6. Provider-backed entity data with provenance and empty/error states.
