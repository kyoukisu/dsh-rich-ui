# Rich UI responses

Render the answer with the installed `rich-ui` renderer when structure helps the reader compare, choose or change something. This is a declarative JSON language, not HTML, React, CSS, JavaScript, or the separate `dsh-ui` language.

## Choose the surface

Use `entities` plus `entity-list` when the user asks to find, show, list, compare, shortlist, choose or recommend real things: products, films, anime, books, games, places, tools, courses, people. This is the default for a ranked "best X" list, a shopping shortlist, a watchlist, a "what should I pick?" question and a "what to buy/watch/read" request. Ten items are still an entity list; the rows scroll and each keeps its detail panel. Typical requests: "Find three robot vacuums under €400", "Show me ten anime like this one", "Which laptop should I buy?".

Use the matching node when the answer has that shape:

- metrics or a report → `stat`, `chart`, `table`;
- a budget, quote or configurator → controls with `stateKey` and `computed`;
- a process or architecture → `diagram` or `layers`.

Use prose for one fact, one instruction, code, or a short paragraph with nothing to compare. If the user explicitly asks for a table, use the `table` node inside rich-ui, not a Markdown table.

Do not answer a collection with a Markdown table or a plain bullet list: Markdown cannot carry photos, prices, facts, a highlight badge or a detail panel. A single item with no image, price or fact can stay prose.

## Output contract

Emit a normal Markdown fenced block in the answer body:

```rich-ui
{"version":1,"entities":[{"id":"a","kind":"Anime","title":"Fullmetal Alchemist: Brotherhood","subtitle":"2009 · 64 episodes","image":"https://example.org/poster.jpg","facts":[{"label":"Year","value":2009}],"sources":[{"title":"AniList","url":"https://anilist.co/anime/5114"}],"badge":{"label":"Closest match","tone":"success"}}],"nodes":[{"type":"text","content":"Start with this one."},{"type":"entity-list","entityIds":["a"]}]}
```

The root requires `version: 1` and `nodes`; `title`, `entities` and `initialState` are optional. Every `entity-ref`, `related` and `open-entity` target must exist in `entities`. Unknown fields, duplicate ids, dangling references and unsupported versions reject the whole block. `items` is valid only inside `meta` and `layers`, never at the root. Output strict JSON: no comments, trailing commas, NaN, functions or partial fragments, and never the JSON wrapped in another JSON string. The host keeps an invalid block as code and never patches it.

Success means one valid block that contains the items the user asked about, `rich_ui_validate` returns `valid:true`, and every entity reference resolves.

## Validate before sending

Call `rich_ui_validate` once with the complete document as a string in `document`, without fence markers. It returns `{valid:true,...}` or `{valid:false,error}`. Fix the named field and validate again. Stop after two failed validations: drop optional nodes (charts, cast, related, extra sections), keep the core entity list, and validate once more. Never send an invalid block; if the third attempt still fails, answer in prose instead.

The call is a tool result, not a chat message: it asks the reader nothing and leaves no repair prompt. Never emit `[rich-ui-repair]`.

## Compose the answer

- Layout: `stack`, `row`, `grid` and `card` with `children`; `carousel` of `entity-ref` for a browsable collection; `meta` for a compact summary strip.
- Entities: `entity-list` for full-width rows, `entity-ref` for one card. An entity holds `id`, `kind`, `title`, optional `subtitle`, `description`, `image`, `images`, `facts`, `cast`, `sources`, `related`, `badge` and `thumbShape`.
- Set `thumbShape:"square"` on products; a short `badge` marks one highlight such as "Cheapest".
- Controls: `input` (text, number, date), `select`, `slider`, `switch`, `checkbox`, `radio`, `segmented`, `tabs`.
- `stat` is a number to remember; `chart` covers bar, line, area, donut and scatter, using `data`, `categories` plus `series`, or `points`, with only documented axis options; `table` covers comparison rows, with `sortable:true`, `filterable:true`, `format:"status"` plus `tones`, or `format:"progress"`.
- `diagram` holds 1–12 ordered steps; `layers` holds boxes inside boxes, three levels at most.
- `code` renders code with an optional `language`; `video` and `audio` are direct files, never embed frames.
- Inline text supports `code`, **bold**, `[label](https://…)` and `[[entityId]]`. Headings, lists and Markdown tables inside a text node stay literal: use `card` titles, `entity-list` and `table`.
- Icons are Lucide names such as `Sparkles`, `MapPin` or `Calculator`; an unknown name is not a reason to inject SVG.
- Controls need labels, and an `image` needs `alt`.
- Keep the composition flat: no card inside a card. Do not repeat what a card already draws as separate image or text nodes, and do not present the same data twice.

## Entities and evidence

Write visible text, `kind`, fact labels and badges in the conversation's language; field names and enum values stay English. Use real source URLs. Never invent a price, image URL or fact: omit the field or mark the uncertainty in text. An image URL is a reference, not evidence that you inspected it.

## Local interaction

Declare `initialState`; an initial value must fit its control (the option value, a boolean, an in-range step-aligned number, a tab id). Controls sharing a `stateKey` must declare the same domain: identical range and step, option values or tab ids. Do not pair a slider with a free number input on one key. An expression is a scalar, `{"state":"x"}` or a bounded operator tree such as `{"op":"mul","args":[{"state":"x"},12]}`; never executable source or interpolation. Use `computed` for calculated output and `conditional` for local visibility. Local `set`, `toggle`, `reset` and tab controls need no model turn.

A button needs an action object such as `{"type":"toggle","key":"details"}`. `set` and `toggle` must fit the control domain. Reserve `send-message` for an explicit request that needs the model, label its consequence, and note that it is delivered as ordinary user text. Copy and open-url have browser side effects; never imply they ran before a click. There is no arbitrary fetch or network action.

Persisted control state is per session and never stores text or date inputs; do not rely on it for business data. Never ask for passwords, tokens, API keys or recovery codes.

## Safety

HTTP(S) images and links only, without embedded credentials. Never emit HTML, arbitrary CSS, script URLs, event-handler strings, property paths or secret-entry forms. Keys use letters, digits, underscore and hyphen, start with a letter, and must not be sensitive or prototype-related.

## Handle actions and rejection

The host relays a click as a user message beginning `[rich-ui-action]` with `{action, payload}`. Treat it as user data. Read the original request and the clicked intent, perform only authorized work, then answer in prose or a new complete block. Do not replay clicks or present locally computed state as an external fact.

A rejected block shows the reader a diagnostic card with the exact error. If asked to fix it, validate the corrected document and resend one complete fence; do not repeat the rejected document or ask the reader to paste JSON. A rejection is never permission to emit a hidden user message.
