# Reference parity roadmap

This is the implementation backlog, not a completed-feature claim.

## Foundation (in progress)

- Strict versioned component contract, safe evaluator, typed local actions.
- Shared renderer and Vite HMR lab, no production DSH changes.
- Entity card -> panel -> gallery -> related item -> return/focus restoration.
- Local calculator and conditional configurator.
- Real host bundle build and isolated DSH instance.

## Durable interactive responses

- Session/block-keyed storage with content versioning and reset semantics.
- Rendering unaffected by unrelated React parent updates.
- Local validation and per-node recoverable errors.
- Partial streaming parser with completed-subtree validation and cancellation handling.
- Model actions visible, explicit, owned by original session, never implicit input blur sends.

## Rich reference vocabulary

- Popover, tooltip, segmented controls, date input, checkbox/radio groups.
- Search/filter/sort tables and entity collections.
- Image lightbox, accessible carousels, media playback.
- Sources/citations panel and document navigation with genuine provenance.
- Writing artifact with explicit edit/copy/export behaviour.
- SVG/Mermaid and more capable chart engine, preserving typography.
- Maps through explicitly configured provider and attribution.

## Mini-app runtime

- Dedicated sandboxed origin/iframe; no ambient DSH page access.
- Explicit allowlisted message bridge, size/time budgets, teardown.
- No default filesystem, shell, credentials or remote dynamic imports.

## Visual parity gates

- Capture the reference in functioning browser at known widths, both themes.
- Reference fixtures with same content and interaction state.
- Side-by-side and overlay review; document deviations by component.
- Browser image-diff tests are regression detection, not perceptual proof of fidelity.
- Test loading/error/empty states, text expansion and missing images.

## Delivery

- Review independent private repository before changing main DSH.
- Pin versioned plugin artifact only after isolated-host functional acceptance.
- Main service installation/activation is a separate explicit delivery stage; do not restart it during development.
