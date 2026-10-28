# DSH Rich UI

An independent, reference-driven rich-response plugin for DeepSeek Harness. Work in progress: functional foundation, **not a completed ChatGPT parity implementation**.

## Fast development

```sh
npm ci --cache .cache/npm
npm run dev
```

Open http://127.0.0.1:4173. This is a standalone laboratory, not a replacement DSH server. Vite HMR updates the same renderer used by the plugin. No NixOS rebuild, no production Harness restart, no credentials or personal DSH profile required.

Scenarios: movie collection with detail panel and gallery, technical explanation, local compound-interest calculator, reactive configurator. Light/dark switch and narrow-screen layout are included.

## Checks

```sh
npm run build
npm run build:plugin
npm test
npm audit
```

For browsers on NixOS use the pinned Docker image, rather than trying to run downloaded Ubuntu browser binaries on NixOS:

```sh
docker pull mcr.microsoft.com/playwright:v1.64.1-noble
docker run --rm --network host --ipc host \
  --user "$(id -u):$(id -g)" -e HOME=/tmp \
  -v "$PWD:/work" -w /work \
  mcr.microsoft.com/playwright:v1.64.1-noble \
  npx playwright test
```

The browser container sees only this project, not the user's home or main DSH profile. It uses host networking to reach the loopback-only laboratory. For initial regression baselines append `--update-snapshots`; baseline generation is not a visual-fidelity approval. Inspect the results first.

See [parity scorecard](docs/PARITY.md), [quality gates](docs/QUALITY.md) and [DSH integration](docs/DSH-INTEGRATION.md).

## Parity, in numbers

Measured, not claimed: **12 of 21** reference scenarios reproduced, 3 partial, 6 missing; deviations itemised in [docs/PARITY.md](docs/PARITY.md). Goldens in this repository are regression baselines and never evidence of visual fidelity.

## Architecture

- `src/core`: strict JSON contract and pure bounded expression evaluator.
- `src/ui`: shared React renderer, entity detail panel, local action/state handling and styles.
- `src/demo`: deterministic scenario fixtures and laboratory shell.
- `src/host`: DSH bundle and browser adapter for `rich-ui` fences.
- `tests`: malicious-input tests, evaluator tests, browser scenarios and screenshot regressions.

Host and browser exports are built separately. No generated TSX execution, unrestricted HTML, shell capability, or remote npm imports. No automated changes to the current DSH installation.

## Status

Core renderer and host packaging are implemented. DSH live integration, visual parity, durable state, partial streaming and the full reference feature set require further verification/development. Refer to QUALITY.md for explicit remaining scope. A successful standalone screenshot does not prove integration into the live DSH GUI.
