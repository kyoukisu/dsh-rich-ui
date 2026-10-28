# DSH Rich UI

Rich, interactive answers inside [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness): entity collections with detail panels, local calculators, live charts, and forms that recompute without another model round trip.

It is a declarative JSON contract rendered by a real React tree — no generated HTML, no `eval`, no shell access. The contract is part of the system prompt, so the model knows it without a tool call.

<img src="docs/images/listing-desktop.png" alt="A product listing with a summary strip, real photos, prices and a green highlight badge" width="820">

<img src="docs/images/films-desktop.png" alt="A film collection with an open detail panel, posters, facts and sources" width="820">

## What it can render

| Group | Nodes |
|---|---|
| Layout | `stack`, `row`, `grid`, `card`, `divider`, `meta` |
| Text | `text` with inline `code` and **bold**, `callout` with optional title, `code` |
| Objects | `entity-ref`, `entity-list`, entity detail panel with gallery, facts, sources, related items |
| Data | `table`, `chart` (bar / line / donut), `computed` |
| Media | `image`, `image-group`, gallery lightbox, popover, tooltip |
| Controls | `input` (text / number / date), `select`, `slider`, `switch`, `checkbox`, `radio`, `segmented`, `tabs` |
| Logic | expressions (`add`, `mul`, `round`, comparisons, …), `conditional`, local actions, `send-message` |

Icons are a curated Lucide subset with semantic tones (`success`, `warning`, `danger`, `muted`), so colour carries meaning instead of decoration.

## Install

Requires DeepSeek Harness `0.2.x` and Node 22.19+.

**From GitHub** (installs and builds the plugin):

```sh
dsh plugin --profile web add github:kyoukisu/dsh-rich-ui
```

**From a local checkout** (what the author uses while iterating):

```sh
git clone https://github.com/kyoukisu/dsh-rich-ui
cd dsh-rich-ui
npm ci
npm run build:plugin
dsh plugin --profile web add link:$PWD
```

Restart the web service afterwards (`systemctl --user restart deepseek-harness` on a systemd install). The plugin adds itself to the profile's bundle list; it needs no NixOS change.

The fence language is `rich-ui`.

## Try the renderer without Harness

```sh
npm ci
npm run dev      # http://127.0.0.1:4173
```

The lab renders the same components the plugin uses, with HMR and no host involvement: `?demo=films`, `listing`, `calculator`, `configurator`, `technical`, `primitives`, plus `&theme=dark`.

## Ask for it

````text
```rich-ui
{"version":1,"title":"Budget","initialState":{"spend":1200},
 "nodes":[
  {"type":"slider","stateKey":"spend","label":"Monthly spend, €","min":100,"max":5000,"step":100},
  {"type":"computed","label":"Per year, €","expr":{"op":"mul","args":[{"state":"spend"},12]}},
  {"type":"callout","tone":"info","content":"Recomputed locally — no model call."}
 ]}
```
````

The full contract is in [prompt-rich-ui/prompt.md](prompt-rich-ui/prompt.md); exact fields, enums and limits live in [references/schema.md](prompt-rich-ui/references/schema.md), and working documents in [references/examples.md](prompt-rich-ui/references/examples.md).

## How it works

- **Node half** registers one system-prompt section built from `prompt-rich-ui/prompt.md`, including the absolute path of the reference files. There is no skill and no tool: the model does not have to look anything up before a first attempt, and opens references only after a rejected block.
- **Browser half** finds `rich-ui` code blocks in assistant messages, validates the JSON against the strict schema, and mounts React into a plugin-owned root. Malformed blocks stay visible as normal code. While the model is still writing, completed nodes render in an inert preview and become interactive once the block settles.
- **Nothing is patched in Harness.** The adapter uses the same DOM technique as other fence plugins and claims only `rich-ui`.

## Safety

- Strict JSON schema, unknown fields rejected, bounded budgets for depth, node count and expression size.
- Expressions are a whitelisted operator tree evaluated in a pure function — no `eval`, no property paths.
- Only `http(s)` media; no credentials in URLs; no passwords or secret inputs.
- Local actions (`set`, `toggle`, `reset`, `copy`, open URL) stay in the browser. `send-message` is the only model callback, needs an explicit click, and is labelled as such.
- Optional state persistence uses `sessionStorage`, opt-in by the host, and never stores text or date inputs.

## Parity and limits

Measured against reference conversations rather than claimed: **12 of 21 scenarios reproduced, 3 partial, 6 missing**. Details, deviations and the backlog are in [docs/PARITY.md](docs/PARITY.md). Known gaps: no sorting/filtering in tables, no syntax highlighting, no math, no maps, no persistent panel, and the desktop entity drawer overlays content instead of reflowing the column.

## Development

```sh
npm run build          # typecheck + lab build
npm run build:plugin   # the two real DSH bundles
npm test               # 101 unit/DOM tests
npm run test:browser   # Playwright, desktop + mobile, goldens never auto-update
npm audit
```

Browser tests run in the pinned image so they do not depend on host libraries:

```sh
docker run --rm --network host --ipc host --user "$(id -u):$(id -g)" \
  -e HOME=/tmp -v "$PWD:/work" -w /work \
  mcr.microsoft.com/playwright:v1.64.1-noble npx playwright test
```

Screenshots in this README are captures of the lab (`docs/images`), not mockups. Golden screenshots in `tests/` are regression baselines and are never proof of fidelity to another product.

## License

MIT — see [LICENSE](LICENSE). Product photography in the demo comes from Wikimedia Commons under free licences; prices and metadata are illustrative.
