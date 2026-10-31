# Interaction performance · 0.5.6

Measured, not inferred. Chromium in the pinned Playwright container, 1440 × 1000,
production-shaped build served by Vite, real demo documents.

| Interaction | Updates | Total JS time | Long tasks (>50 ms) |
| --- | --- | --- | --- |
| Filter a task table, one input event per character | 60 | 37 ms (~0.6 ms each) | none |
| Drag one slider across its range | 100 | 30 ms (~0.3 ms each) | none |

Method: dispatch `input` events with a native value setter inside one page task,
then wait 400 ms and read `PerformanceObserver` `longtask` entries. This isolates
React state propagation and dependent block recomputation; it does not model
paint or network.

## What follows

No optimisation is justified by these numbers. The suspected cost — recomputing
every table cell and chart datum for each state change, plus a synchronous
`sessionStorage` write — stays well inside a frame for the demo documents.

Re-measure before changing the design:

- a near-budget document (large table and chart) rather than the demo;
- a real pointer drag rather than synthetic `input` events;
- a low-end mobile profile via CDP throttling.

Until then, adding memoisation or virtualisation would trade complexity for an
unmeasured problem.
