# Compromise and parity ledger

No entry below means accepted visual parity. User-facing quality target remains high; implementation shortcuts must be visible and revisited.

| ID | Status | Area | Evidence / consequence | Next action |
|---|---|---|---|---|
| P-001 | Open | Host drawer layout | Lab reflows around desktop drawer; actual DSH adapter currently overlays a fixed drawer, not registered host-side layout pane | Find supported sidebar surface integration; test preserving other plugins |
| P-002 | Open | Entity success reference | Anonymous ChatGPT shared page panel returns an error; success geometry/content not observed | Capture real working reference with authorized existing identity, no fabricated success-state parity |
| P-003 | Open | Reference assets | Regression tests mock poster URLs with deterministic art; detects layout drift only, not image crop parity | Matched source assets and attribution manifest for reference captures |
| P-004 | Open | Fonts and metrics | System sans fallback; original ChatGPT font and exact computed styles not measured | Extract legal/public font assets or choose and explicitly approve equivalent; record line-wrap differences |
| P-005 | Open | Streaming | Host adapter waits for valid settled JSON; no completed-subtree streaming | Bounded incremental parser, partial schema acceptance, cancellation tests |
| P-006 | Open | Model roundtrip | Real host fixture mount and local controls proven; authenticated model output + replay not proven | Test with explicit test provider, no production credential copying |
| P-007 | Open | Data enrichment | Demonstration fixtures use authored metadata, not dynamic provider integration | Versioned entity provider contracts, provenance, errors/empty/loading |
| P-008 | Open | Mini-apps/maps/artifacts | Not implemented, not covered by baseline renderer | Separate capability-restricted sandbox and provider stages |
| P-009 | Intentional | State privacy | Text and numeric input values not persisted; controlled enums/sliders/switches/tabs use opt-in sessionStorage | Keep privacy default; explicit opt-in for any future drafts |
| P-010 | Fixed | Wrong modal semantics | Initial desktop panel dimmed/blurred background unlike observed reference | Desktop nonmodal drawer now separate from mobile/explicit modal |
| P-011 | Fixed | Keyboard and contrast | Browser tests exposed focus loss on related entity navigation and low-contrast inactive tab | Focus restoration regressions and axe gate added |
| P-012 | Fixed | Monochrome icons | Every row icon rendered one grey tone; the reference uses colour semantically (red failure, muted timeline) | Semantic `tone` token on icons, both themes measured, assertion in browser tests |
| P-013 | Fixed | Entity vocabulary | Only poster cards existed; reference also uses full-width entity rows with compact posters | `entity-list` node with row layout, keyboard open, shared detail panel |

Severity: safety/data loss = S0, broken main interaction/keyboard = S1, meaningful visual/interaction deviation = S2, minor optical polish = S3. Open items are not silently waived by a green test run. Fixed items still require ongoing regression coverage.
