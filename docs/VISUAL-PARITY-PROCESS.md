# Visual parity: a verification process for DSH Rich UI

Primary-source review date: **2026-10-28**. This is a practical project policy, not a claim that similarity is achieved. The recommendations below do not add new dependencies, services or CI by themselves.

## 1. Decision: two independent checks

**Reference parity** answers: "How closely does the implementation match the observable original under the same conditions?" The source here is shared ChatGPT pages, the available states and saved screenshots, not Figma and not an AI account of how the original is built.

**Self-baseline regression** answers: "Has our previously approved rendering changed?" The source is a human-approved screenshot of our implementation. Even a perfectly green regression can preserve a wrong design.

Do not merge these checks into one status. For each scenario/state pair, report them separately:

- parity: `verified`, `deviation`, `unverified` or `not observable`;
- regression: `pass`, `changed`, `missing baseline` or `not run`;
- functional/accessibility: the actual result and the limits of the check.

No available original means `unverified`, not successful parity. A passing screenshot test is not "pixel perfect". Do not publish an invented similarity percentage; `maxDiffPixelRatio` measures the share of differing pixels in one specific comparison, not design quality or the share of implemented features.

## 2. What exists now and what does not yet

The acceptance contract is in [QUALITY.md](../docs/QUALITY.md); the backlog is in [ROADMAP.md](../docs/ROADMAP.md). The current lab runs separately from the main DSH; the address `http://127.0.0.1:4173` is not proof of integration into the user-facing Harness.

The [Playwright configuration](../playwright.config.ts) already has desktop 1440 × 1000 and mobile on the iPhone 13 profile with Chromium; the [browser scenarios](../tests/e2e/scenarios.spec.ts) have four demos, both themes, interaction checks, overflow checks and screenshots of `.lab-answer`. A mobile profile with Chromium is emulation, not a Safari/iOS check.

In these scenarios, every TMDB image is replaced with one SVG. That is useful determinism for regression, but not evidence of the real posters or gallery. The current `maxDiffPixelRatio: .01` is an existing technical tolerance, **not** approval to lose detail and **not** "99% fidelity". Justify it with concrete diffs; this document does not change the configuration.

The [lab styles](../src/demo/lab.css) set a stack with Inter, but a name in `font-family` does not prove that this font is the one loaded. The [demo data](../src/demo/fixtures.ts) and the lab shell are not an approved copy of the reference.

## 3. Source without Figma: build the reference contract first

Use the links from the quality contract:

- [Shared conversation A](https://chatgpt.com/share/6ae18b9d-0c24-83eb-941a-3c477ae80fe7).
- [Shared conversation B](https://chatgpt.com/share/6ae19175-cc80-83ed-8f84-befd5376ec83).

These are the project reference URLs, not confirmation that their live content was studied while this document was prepared. While you work, open the original in a working browser. A shared page may not provide the original interactive UI, some states or access to data. Do not rebuild unavailable behaviour as fact, and do not treat a load failure as proof that a feature is absent.

For each observable block, keep a short specification: URL, capture time, scenario name and text, visible state, viewport, theme, crop, scroll, assets, available actions, observation limits. Keep the original unchanged screenshot and a separate crop of the response, not an AI redrawn "reference". Do not replace different texts or card sets with identical scenario names.

If the original DOM is available, measure it only read-only with the permitted browser. Do not copy private APIs, tokens or a full authenticated page dump. If the DOM is unavailable, keep size estimates from the image as **estimates**, not `getBoundingClientRect` measurements. Do not present CSS inferred from a screenshot as the original design tokens.

Store comparison material outside the checkout, for example `~/.cache/dsh-scratch/dsh-rich-ui-parity/<run-id>/`: `reference/`, `actual/`, `diff/`, `geometry/`, `manifest.json`, `review.md`. Public shared URLs do not guarantee the absence of personal data: minimize the capture and do not upload it to third-party services without permission. Approved regression goldens may live next to the tests in Git; do not include scratch artifacts there.

## 4. Reproducibility contract

Before a comparison, record the actual values in the manifest, not the implied values:

- implementation commit/dirty state, fixture/content version, capture timestamp and reference URL;
- OS/container image digest, Playwright package and browser revision, browser engine, headless/headed mode;
- viewport in CSS px, screenshot dimensions in physical px, `deviceScaleFactor`/DPR, screenshot `scale`, browser zoom, scrollbar behaviour;
- theme, `colorScheme`, locale, timezone, reduced motion, touch/mobile flags, scroll position;
- source and checksums of assets/fonts, the font face/weight actually used, image readiness and data state;
- crop/clip, selectors or semantic anchors, screenshot options, thresholds and the list of masked regions with the reason.

Reference and actual must have the same text, posters, crop/fit, icons, font weights and metrics, container width and state. If the original asset is unavailable or the font cannot be reused legally, record a deviation and its effect on line wraps and geometry. Do not present a substituted asset as a match. For a separate deterministic regression, mock assets are acceptable, but mark the result as mocked and do not apply it to reference parity.

For repeatable runs, use one pinned browser/container and lockfile. On NixOS, follow the container path from the [README](../README.md), and first check the `@playwright/test` version actually installed from the lockfile against the image: a range in the package manifest and an example command in the README are not a pin by themselves. Do not update the toolchain together with a visual correction; a browser/font environment migration is a separate review, not automatic acceptance of new goldens.

Before a screenshot, wait for the chosen UI state, `document.fonts.ready`, a successful `decode()` of the required images and stable geometry. Check failed loads. Do not just wait for a timer. `networkidle` or two identical captures do not prove that the content is correct: they can stabilize a fallback font or a broken image. Disable animations/transitions and the caret for a static comparison; fix the cursor, hover and focus state. For animation, check a separate agreed moment or the end state and reduced motion; do not hide the whole component.

Do not scale the reference to a "similar" size to get a smaller diff. If the reference conditions are unknown, make an explicitly labelled qualitative comparison and limit the conclusions. Different browser engines or DPR need separate baselines, not one broad shared tolerance.

## 5. Matrix: content × environment × state

The minimum regression smoke is all four demos (`technical`, `films`, `calculator`, `configurator`), desktop/mobile, light/dark. Fill reference parity only where a matching observation exists; the rest of the matrix stays unverified. Start from the existing test sizes; add a narrow width of 320 CSS px and an intermediate breakpoint as separate reflow checks, without replacing the matching reference viewport.

Check more than the first screen:

- technical: long heading, inline code wraps, lists, links, no horizontal overflow;
- films: collection start/end, detail open, gallery image switched, related item, close, focus restoration, long metadata;
- calculator: initial, edited, reset, invalid/out-of-range input, clear recovery and a local update without a model/network callback;
- configurator: changed text, conditional block off/on, all tabs, copy/notification and long values;
- shared states: keyboard focus, hover where it exists, loading, empty, error, missing image, overflow, reduced motion and zoom/reflow.

The last group is a coverage plan, not a claim that the current renderer has every state. If a state is unsupported or not observable in the reference, record that explicitly. Do not add a feature only for a screenshot without a separate scope. Isolated component crops speed up diagnosis, but they do not replace the full response and host context: inherited styles, width, stacking, portal/dialog and focus can differ in DSH. The live host check happens separately, after an approved integration; do not restart the main service for visual research.

## 6. Three evidence layers instead of one "assessor"

### A. Measured DOM geometry and computed styles

In actual, capture JSON for stable semantic anchors: response container, heading, paragraph, card, poster, metadata, control, dialog, gallery. For each one, record `getBoundingClientRect()` (`x`, `y`, `width`, `height` in CSS px), the position relative to the response, gap/padding/margin, border widths/radius, box shadow, overflow and scroll/client sizes.

Through `getComputedStyle()`, record font family/size/weight/line-height/letter-spacing, text/background/border color, display/grid/flex rules, alignment, object-fit/position. For text, check the actual line wraps and height, not only a matching `font-size`. Account for the viewport-relative coordinates of `getBoundingClientRect()` and for scroll; do not compare them directly with crop-local physical pixels without converting DPR/origin.

When a reference DOM exists, collect the same set. Otherwise compare the actual measurement with annotated screenshot bounds, and state the error margin. Set tolerances for the measured property and the goal: for example, exact container width at the same viewport, and a separately documented subpixel tolerance for anchors. Do not introduce a universal "everything ±N px" without a basis.

### B. Pixel/perceptual evidence

Save reference, actual, side-by-side, a semi-transparent overlay and a pixel diff at identical sizes. Playwright `toHaveScreenshot()` is the base local regression tool; it stabilizes successive captures and uses pixelmatch. `threshold` sets the permitted perceived colour difference of one pixel, while `maxDiffPixels`/`maxDiffPixelRatio` set the permitted number/share of differing pixels. These are different settings, not semantic similarity.

Start with a strict comparison, study the source of the noise, then justify a narrow tolerance explicitly. Do not widen it until the test turns green. Do not mask text, controls, layout or assets that are the subject of parity. For a genuinely volatile region, give the coordinates/selector and an explanation; keep an unmasked capture next to it.

If a local perceptual metric is added (for example SSIM), save its name, version, preprocessing, region and raw values. It is a supporting signal: high similarity can hide a wrong label, missing focus or an inaccessible button; low similarity can come from font rasterization. No converted "overall fidelity %".

### C. Human review + AI critic

A human reviews the original side-by-side/overlay, then the problems by area: hierarchy, typography/line wraps, spacing, geometry, assets, borders/contrast, responsive behaviour, transitions and interactive states. Final acceptance of reference parity and goldens belongs to the human.

The AI gets a bounded evidence pack: both images with named provenance, geometry/style JSON, the scenario/state, known limits and the diff. Its job is to act as critic: name the area, the observed difference, the evidence, the probable cause and the severity, and propose a verifiable narrow fix. Ask it to separate fact from hypothesis; do not accept "looks 95%" or model confidence as a measurement. Implementer and critic can be split across agents, but a second AI does not replace independent human approval. If the AI does not see the original images, or they do not match in conditions, the conclusion is insufficient evidence, not pass.

## 7. Accessibility — a separate mandatory gate

After you enter each important state, run axe in a real browser, preferably through the open-source `@axe-core/playwright`; the dependency is already in [package.json](../package.json), and a browser scan of the main scenarios is included in [E2E](../tests/e2e/scenarios.spec.ts). Extend the check of expanded states and both themes separately. Keep rule IDs, targets, impact, violations and `incomplete`; the last require a manual decision. Checks in JSDOM alone do not replace a browser scan, in particular for colour contrast.

Manual checks are mandatory: Tab/Shift+Tab, visible focus in both themes, focus trap and restoration, Escape, accessible names, reading order, keyboard/touch parity, zoom/reflow and a screen-reader smoke test. Zero axe violations mean only "no automatically detectable problems found in the scanned state", not WCAG compliance. Do not carry a published vendor coverage percentage over to this project.

If the original has inaccessible contrast or an unclear control, do not copy the defect blindly: keep the semantics and accessibility, and record the visual deviation as an accessibility compromise to agree on. Do not disable a whole rule or subtree to get a green gate; any narrow exception gets an owner, a justification and a revisit date.

## 8. Severity and the compromise ledger

The classification is a local policy, not an automatic pixel-count score:

- **S0 / blocking:** data loss or an unsafe action, the main scenario impossible, a keyboard trap with no exit; fix it, do not accept it as a visual compromise.
- **S1 / major:** a missing key state or control, wrong behaviour, unreadable text, significant reflow/overflow, an unavailable main path; blocks acceptance of the affected scenario.
- **S2 / material:** visible wrong typography, wraps, poster crop, card/panel geometry or spacing without blocking the main path; fix it or get explicit human acceptance of a limited deviation.
- **S3 / minor:** local cosmetics with low impact, for example confirmed rendering noise; allowed only with evidence and a record, never silently.

Keep the ledger together with the review evidence; approved persistent decisions can move to a separate project document later, only within an approved scope. An entry contains: ID; scenario/viewport/theme/state; reference and actual artifacts; observation/measurement; severity; root-cause hypothesis; the proposed compromise; the effect on parity/accessibility/maintenance; owner; approver/date; status (`open`, `accepted deviation`, `fixed`, `unverified`); revisit date/trigger.

Template example, not an existing approved compromise: `VP-___ | films/mobile/dark/detail | ref/actual links | source image unavailable | S2 | legal/source constraint | alternative asset, no asset-parity claim | owner ___ | approver pending | open | revisit when original asset available`.

Do not lower a severity because the budget ran out. Do not turn an accepted deviation into a quiet "pass"; the report must keep the similarity boundary. An unapproved compromise stays open.

## 9. Bounded implementation loop

1. Pick one scenario or a small component slice and concrete states. Fix the reference contract, the environment and an immutable reference.
2. Run the initial capture, geometry/style measurements and a functional check. Separate a design mismatch from failed assets and environment drift.
3. Produce a list of prioritized discrepancies with evidence. Take at most the three most important ones per iteration; do not rewrite the architecture for cosmetics.
4. Make a narrow fix, repeat the matching captures and the affected functional/a11y checks. Then run the existing desktop/mobile light/dark regression matrix.
5. By default, at most **two corrective passes** per chosen slice. If a discrepancy does not converge, stop with evidence and the ledger: missing reference information, a human design decision or a separate budget is needed. Do not run an endless self-improvement loop, and do not lower thresholds to finish.
6. Give the human the side-by-side/overlay/diff, a measurement summary, the residual list and the exact scope. Acceptance means agreement with the observed state and the known limits, not with unseen states.

This is a local time-box policy, not an endorsement of the listed vendors. Paid tool calls/services and sending material outside need prior user approval. If the scope grows, return the decision to the owner first.

## 10. Golden approval and the minimum adoption path

The first baseline is a **candidate**, not approved truth. A normal verification run must not create or update approved snapshots: when you add CI, use `--update-snapshots=none` explicitly and check that no unexpected golden changes appear. For new goldens, separate capture from approval. An agent can prepare candidate snapshots only in an explicitly assigned step; do not approve changed goldens automatically, use a blanket update as a fix for failing tests, or accept a baseline just because a rerun passed.

A human reviews every changed golden and the related cause/ledger. The review shows old/new/diff, the state/environment manifest and the functional result. A baseline update after approval is a separate visible change with an identifiable approver; it does not delete a reference deviation. A screenshot update does not "fix" functional/a11y failures.

Applicable now, without Figma or cloud:

1. Use the existing fixtures/lab and Playwright; collect one verifiable reference slice from a shared page under comparable conditions.
2. Add geometry/style JSON and a manual overlay review to the evidence; for the current mocked screenshots, keep only a regression claim.
3. After a separate implementation scope, settle the environment manifest, an explicit no-update verification mode, missing states and browser axe. First locally, then in CI with the same pinned environment.
4. Add Storybook only when there is a real need for a catalogue of component states or reuse. Deterministic fixtures already give the first benefit of stories; migrating the whole project is not a prerequisite for parity.

**Storybook / Chromatic.** Storybook stories model component states; the Visual Tests documentation offers Chromatic and cloud capture with baseline review. Explicit states and human review are useful, but the service does not prove a match with an external original. Do not connect Chromatic, an account/token, upload or a subscription now. On future approval, keep the ban on auto-approval of new changed goldens; syncing an already human-approved baseline is not the same as a first AI approval.

**Figma Code Connect / MCP.** In current primary docs, MCP passes design context to agents, and Code Connect maps Figma components to existing code for reuse. This reduces guessing, but does not replace runtime measurements/review. Without a Figma source for the shared ChatGPT pages, these tools will not extract the real design tokens and will not prove fidelity. Do not create an artificial Figma from our implementation and declare it an independent reference; that is a circular check. Connect them later only if an authoritative design source appears and the cost/data transfer is approved. Plan terms change: the docs checked now list a Dev/Full seat and Professional/Organization/Enterprise for Code Connect, with Professional limits; the old blanket claim "Enterprise/Organization only" is no longer accurate enough.

## 11. What the final report must contain

The report records the checked scope (reference URL, scenario, content, states, viewport/theme, environment), evidence links, separate parity/regression/functionality/accessibility results, remaining deviations with severity and the actual human approval. If a baseline was created for the first time, the original is unavailable, assets were substituted or the host was not checked, write that explicitly. State the commands that ran and the real results; do not imply that tests ran because a document exists.

Exit criterion: the chosen states are reproducible; no open S0/S1 in the scope under acceptance; material deviations are fixed or explicitly accepted by the owner; candidate goldens passed human review; the functional and a11y gates are checked with the stated limits. Until then the status is partial/unverified, with no invented fidelity score.

## 12. Primary sources and the limits of the conclusions

All the following sources were read directly on **2026-10-28**. The review date is not a publication date and not a guarantee that a future API stays unchanged. The "two corrective passes" policy, the severity scale and the auto-approval ban are decisions of this process, not vendor quotes.

- [Playwright: Visual comparisons](https://playwright.dev/docs/test-snapshots) — `toHaveScreenshot`, stabilization, the effect of OS/browser/fonts/environment, pixelmatch, thresholds, updating and reviewing snapshots.
- [Playwright: Accessibility testing](https://playwright.dev/docs/accessibility-testing) — `@axe-core/playwright`, scanning of the current state, automation limitations, narrow exceptions and attaching results.
- [Storybook: Visual tests](https://storybook.js.org/docs/writing-tests/visual-testing) — stories as baseline tests, Chromatic cloud capture, manual acceptance of changes, the difference between a screenshot and a markup snapshot. The text was read; the service interface images were not studied separately, and the service was not run.
- [Figma: Code Connect introduction](https://developers.figma.com/docs/code-connect/) — the link between design components and real code examples, stronger MCP context, current seats/plans and Professional limits.
- [Figma: MCP server introduction](https://developers.figma.com/docs/figma-mcp-server/) — design context, components/variables, reuse through Code Connect; runtime verification stays a separate task. Some write features are described as beta and potentially usage-based paid; that is no basis to connect them without approval.
- [Deque: axe-core README](https://raw.githubusercontent.com/dequelabs/axe-core/develop/README.md) — the open-source engine, `incomplete` and the need for manual review, JSDOM/contrast limits. The quoted vendor aggregate coverage statistic is not used as a metric for this project.

This document was written as research and process. It does not change tests, does not install Storybook/axe/Figma/Chromatic, does not update snapshots, does not approve parity and does not commit or deploy.
