# Quality contract

## Target and evidence

The target is observable ChatGPT rich-response behaviour, not inferred private APIs. Reference conversations:

- https://chatgpt.com/share/6ae18b9d-0c24-83eb-941a-3c477ae80fe7
- https://chatgpt.com/share/6ae19175-cc80-83ed-8f84-befd5376ec83

An assistant's claims about its own implementation are not authoritative specifications. Existing screenshots are reference evidence; the current fixtures are NOT approved pixel-perfect copies. No visual-parity percentage is claimed.

## Acceptance scenarios

1. Technical explanation: coherent body text, inline code, restrained icon rows, one containing surface; no overflow at 390 px.
2. Movie collection: posters, readable metadata, keyboard-operable horizontal collection; open detail, switch images, inspect source links, related item, close and restore focus.
3. Reactive calculator: every input recomputes locally without network/model requests; reset restores initial state; invalid math produces visible recoverable feedback.
4. Configurator: input text, conditional sections, tabs and copy reflect current state; controls remain local.
5. DSH adapter: only assistant-owned rich-ui fences render; malformed source remains visible; source changes and DOM removal cleanly unmount; actions retain owning session.

## Gates

- TypeScript and both production builds.
- Core/schema tests: malformed input, unsafe URLs, unknown fields, prototype pollution, expression budgets, numeric overflow.
- DOM adapter and renderer tests.
- Playwright desktop/mobile functional tests with page-error collection.
- Light/dark screenshots for every fixture. First generated screenshots are regression baselines, NOT proof of fidelity to ChatGPT. Manually inspect before approving.
- Compare matching viewport and content against captured references. Evaluate typography, line-wrap, icon size/alignment, padding, border contrast, panel geometry and actual interaction states.
- `npm audit`: no known vulnerabilities at dependency lock creation; rerun when dependencies change.

## Deliberately not completed yet

Same-turn validation feedback, safe isolated mini-app runtime, maps/provider integration, Mermaid/ER graphs, entity data enrichment, writing artifacts, citations-to-document navigation, full fidelity measurements and live model-host end-to-end acceptance. Table filters are implemented; they are no longer on this list.

## Security boundaries

The renderer accepts data, never source code. Expressions use a bounded operator evaluator. No eval/Function, arbitrary HTML, shell bridge or host filesystem access. User-triggered send-message is the only model callback. External image URLs can make browser requests; use trusted media/data providers in production. A future mini-app sandbox must have a separate origin/sandbox policy and explicit capability bridge; it is not provided by this renderer.
