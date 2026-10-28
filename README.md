<div align="center">

# DSH Rich UI

**Answers that behave like an interface, not a wall of Markdown.**

Entity collections with detail panels, calculators that recompute as you drag, charts, forms and tables — rendered inside [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) from a strict JSON contract.

[![stars](https://shieldcn.dev/github/kyoukisu/dsh-rich-ui/stars.svg?variant=branded&size=xs)](https://github.com/kyoukisu/dsh-rich-ui/stargazers)
[![license](https://shieldcn.dev/github/kyoukisu/dsh-rich-ui/license.svg?variant=branded&size=xs)](LICENSE)
[![last commit](https://shieldcn.dev/github/kyoukisu/dsh-rich-ui/last-commit.svg?variant=branded&size=xs)](https://github.com/kyoukisu/dsh-rich-ui/commits/main)
![DSH](https://shieldcn.dev/badge/DSH-0.2.x-1f6feb.svg?variant=branded&size=xs)

[Install](#install) · [Quick start](#quick-start) · [Contract](prompt-rich-ui/prompt.md) · [Parity](docs/PARITY.md) · [Safety](#safety)

</div>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/listing-desktop-dark.png">
    <img alt="A product listing rendered by the plugin: summary strip, real photos, prices and a green highlight badge" src="docs/images/listing-desktop.png" width="860">
  </picture>
</p>

## What this is, and why

A model can describe a comparison, but a wall of Markdown makes the reader do the layout work. This plugin gives the model a small declarative language for the cases where structure carries the answer: side-by-side options, an object you want to inspect, a number the reader will change.

The renderer is a real React tree behind a strict schema. There is no generated HTML, no `eval`, no shell access, and no page-level JavaScript from the model. Local controls recompute in the browser; the model is only called again when the reader explicitly asks.

<table>
  <tr>
    <td width="50%"><img alt="Film collection with an open detail panel: posters, facts and sources" src="docs/images/films-desktop.png"></td>
    <td width="50%"><img alt="A calculator with sliders that recompute the result locally" src="docs/images/calculator-dark.png"></td>
  </tr>
</table>

## Install

Requires DeepSeek Harness `0.2.x` and Node `22.19+`. No NixOS change, no patched Harness.

```sh
dsh plugin --profile web add github:kyoukisu/dsh-rich-ui
systemctl --user restart deepseek-harness   # or restart however your Harness runs
```

From a checkout — this is the loop the author uses:

```sh
git clone https://github.com/kyoukisu/dsh-rich-ui && cd dsh-rich-ui
npm ci && npm run build:plugin
dsh plugin --profile web add link:$PWD
```

The plugin registers itself as a bundle; the fence language is `rich-ui`.

## Quick start

Ask for something that benefits from structure, in a new session:

```text
Compare three electric kettles by price, volume and features. Make it clickable.
```

The reply arrives as an interface: a summary strip, rows with photos, and a green highlight on the cheapest option. Opening a row shows facts, sources and related items without leaving the conversation.

Things worth trying: *"build a budget calculator with three sliders"*, *"show this quarter as a chart and a table"*, *"make a configurator with tabs and conditional warnings"*.

## What it can render

| Group | Nodes |
|---|---|
| Layout | `stack`, `row`, `grid`, `card`, `divider`, `meta` |
| Text | `text` with inline `code` and **bold**, `callout` with optional title, `code` |
| Objects | `entity-ref`, `entity-list`, detail panel with gallery, facts, sources, related entities |
| Data | `table`, `chart` (bar / line / donut), `computed` |
| Media | `image`, `image-group`, gallery lightbox, popover, tooltip |
| Controls | `input` (text / number / date), `select`, `slider`, `switch`, `checkbox`, `radio`, `segmented`, `tabs` |
| Logic | expressions (`add`, `mul`, `round`, comparisons…), `conditional`, local actions, `send-message` |

Icons are a curated Lucide subset with semantic tones (`success`, `warning`, `danger`, `muted`) so colour means something. Light and dark themes follow the host palette and font.

## The contract in ten lines

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

<details>
<summary>Entities, tables, charts and actions — one complete document</summary>

```json
{"version":1,"title":"Кино на вечер",
 "entities":[{"id":"a","kind":"Фильм","title":"Arrival","subtitle":"2016 · фантастика",
   "image":"https://example.org/poster.jpg",
   "facts":[{"label":"Режиссёр","value":"Дени Вильнёв"}],
   "sources":[{"title":"TMDB","url":"https://www.themoviedb.org/movie/329865-arrival"}],
   "badge":{"label":"Выбор редакции","tone":"success"}}],
 "nodes":[
  {"type":"meta","items":[{"icon":"film","text":"3 фильма"},{"icon":"clock","text":"2 часа"}]},
  {"type":"entity-list","entityIds":["a"]},
  {"type":"table","columns":[{"key":"k","label":"Что"},{"key":"v","label":"Сколько"}],
   "rows":[{"k":"Сеансов","v":3}]},
  {"type":"chart","kind":"bar","data":[{"label":"Пн","value":2},{"label":"Вт","value":5}]}]}
```

</details>

The authoritative text is [prompt-rich-ui/prompt.md](prompt-rich-ui/prompt.md); exact fields, enums and budgets live in [references/schema.md](prompt-rich-ui/references/schema.md), and working documents in [references/examples.md](prompt-rich-ui/references/examples.md).

## How it works

```mermaid
flowchart LR
  A["Model writes a rich-ui fence"] --> B["Adapter finds the code block"]
  B --> C{Strict JSON schema}
  C -- invalid --> D["Stays a normal code block"]
  C -- valid --> E["React renderer mounts"]
  E --> F["Local state, no model call"]
  F -- explicit button --> G["rich-ui action message"]
```

- **Node half** registers one always-on system-prompt section with the whole contract and the absolute path of the reference files. No skill, no tool call: the model can answer on the first attempt, and opens references only after a rejected block.
- **Browser half** validates the fence and mounts into a plugin-owned root. While the model is still writing, closed nodes render in an inert preview and become interactive when the block settles.
- Malformed documents are never repaired: they stay visible as code, which is also how you can tell the model got a field wrong.

## Safety

| Risk | Mitigation |
|---|---|
| Arbitrary code execution | Declarative JSON only; no HTML, CSS, JS, `eval` or property paths |
| Prompt-injected actions | Local actions cannot call tools; `send-message` needs an explicit click and is delivered as ordinary user text |
| Secrets in the UI | Password/secret state keys are rejected; no secret input components exist |
| Hostile URLs | `http(s)` only, credentials in URLs rejected |
| Resource exhaustion | Bounded depth, node count, string size and expression budget |
| Stored data | Persistence is opt-in, per session, and never stores text or date inputs |

## Parity with the reference

Measured, not claimed: **12 of 21** reference scenarios reproduced, **3 partial**, **6 missing** — with an itemised deviation list in [docs/PARITY.md](docs/PARITY.md). Missing today: sortable tables, code highlighting, math, maps, persistent panels, and a detail drawer that reflows the conversation column instead of overlaying it.

Known limitation: the fence label is not preserved by Harness, so an unlabelled block is claimed only when its payload looks like a spec document and passes the strict parser. A `json`-labelled block is never claimed.

## Troubleshooting

**The block stayed as code.** The JSON did not pass the schema — usually an unknown field (`title` inside a node that has none, or `items` from another plugin's syntax). Ask the model to resend the whole block; nothing was silently changed.

**Images show a placeholder.** The URL is wrong, blocked by the remote host, or not `http(s)`. Ozon/WB CDNs reject hotlinks; use a permitted source or your own media host.

**Old `dsh-ui` messages stopped rendering.** That is a different plugin's syntax. This one claims `rich-ui` only.

## Development

```sh
npm ci
npm run dev            # lab at http://127.0.0.1:4173, HMR, no Harness needed
npm run build          # typecheck + lab build
npm run build:plugin   # the two real bundle artifacts
npm test               # 101 unit and DOM tests
npm run test:browser   # Playwright desktop + mobile (goldens never auto-update)
```

Browser tests run in a pinned container so no system libraries are required:

```sh
docker run --rm --network host --ipc host --user "$(id -u):$(id -g)" \
  -e HOME=/tmp -v "$PWD:/work" -w /work \
  mcr.microsoft.com/playwright:v1.64.1-noble npx playwright test
```

Scenarios in the lab: `?demo=films`, `listing`, `calculator`, `configurator`, `technical`, `primitives`, plus `&theme=dark`.

Screenshots in this README are captures of that lab, not mockups. Golden images under `tests/` are regression baselines and say nothing about fidelity to another product.

## License

MIT — see [LICENSE](LICENSE). Demo photography comes from Wikimedia Commons under free licences; prices and metadata are illustrative. DeepSeek Harness is a separate project by DeepSeek; this plugin is unaffiliated.
