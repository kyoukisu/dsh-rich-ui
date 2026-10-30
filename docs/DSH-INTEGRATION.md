# DSH integration: isolated rich-ui plugin

## What is implemented

This is an out-of-tree Cordis bundle, not a Harness source patch. Target inspected: DSH `0.2.1-rc.2` installed at `/nix/store/ljpcc1lmg2qf186bbz5swzc2hn9knff5-deepseek-harness-0.2.1-rc.2/lib/deepseek-harness/`.

- `src/host/index.ts`: Node plugin registers a structured-output instruction through `systemPrompt.section`, using `getSectionOrder('STRUCTURED_OUTPUT')`.
- `src/host/client.tsx`: browser plugin exports `inject = ['sessions']`, `apply(ctx)` and a disposer. It mounts the actual `RichResponse` with a validated `RichSpec` and optional `onAction`.
- `cordis.patch.yml`: inserts only `@kyoukisu/dsh-rich-ui` under `rich-ui`.
- `vite.plugin.config.ts`: emits Node ESM plus the **real DSH browser module protocol**, not an ES-module script. The latter calls `window.__ModuleLoader__.load({ id, factory(require) { …; return module.exports } })`.

### Why DOM, not a fictitious fence registry

The installed `@changfenhuang/dsh-genui/src/index.ts` re-exports its Node plugin. Its `src/plugin/index.ts` installs prompt, tools and optional asset routes. Actual fence rendering in `src/client/index.tsx` calls `installDomFenceRenderer`; its `cordis.patch.yml` comment mentioning a fence registry is stale. Inspected renderer `lib/types/client/registry.d.ts` exposes generic slots, not a Markdown fence hook. `root` is explicitly a single occupied slot: registering there replaces the application and is forbidden.

This adapter therefore follows genui's existing DOM technique, but claims **only `rich-ui`**, never `dsh-ui`. It requires an assistant ancestor `[data-chat-flow-kind="assistant-step"]`, an exact leaf language label, and a stock code surface (`.md-code-block`, `.code-block`, `.code-block-small`, or parent of `[data-code-block-content]`). While a stream is incomplete it previews only closed, valid nodes in an inert subtree, then activates the settled document; invalid source stays a native code block. It observes DOM settlement and revisions. Unload/removal unmounts roots and restores the source. It never replaces the host conversation component.

### Security and actions

Input is strict JSON, capped at 256,000 characters, rejecting pollution keys; `parseRichSpec` then enforces the shared schema. No `eval`, HTML parsing, structural JSON repair or arbitrary component imports. React render failures restore the source block. The renderer receives `(action: string, payload?: Record<string, unknown>) => void`; callbacks serialize `[rich-ui-action] {"action":…, "payload":…}` and send through `ctx.sessions.scope(capturedSessionId).get('conversation').send`. They do not look up a new active session at click time. Oversized actions/payloads are dropped, payloads are never logged, and no callback is supplied when the session is unavailable.

### Model contract and native skill discovery

The Node half registers one always-on structured-output section built from `prompt-rich-ui/prompt.md`: when a visual block is warranted, the strict root shape, local-first interactions and explicit model actions. There is no lazily loaded skill; the contract is part of the system prompt, and the two reference files are named by absolute path in that same section, to be opened only after a rejected block or for an unfamiliar node. The same Node half registers `rich_ui_validate` so the model can check the exact document before emitting it.

The English skill links a complete field reference and six examples (including exact popover, tooltip and image-group contracts); examples were parsed with the actual current `parseRichSpec`. It distinguishes ordinary prose, rich-ui and dsh-ui, explains entities, local expressions, allowed actions and side effects, and never asks the model to emit arbitrary executable code. A new Node process is required to activate this registration; rebuilding a browser bundle alone does not activate Node changes. Published packages must include `skills/**` (including references). No additional runtime package dependencies are required beyond Node builtins. The host registers the `rich_ui_validate` tool, which runs the same strict parser against the exact document and returns `{valid,error}` without touching the conversation.

## Package/build contract

The package owner must configure these fields (the adapter task does not edit the manifest):

```json
{
  "name": "@kyoukisu/dsh-rich-ui",
  "type": "module",
  "main": "lib/host/index.js",
  "exports": {
    ".": "./lib/host/index.js",
    "./client": "./lib/host/client.js",
    "./package.json": "./package.json"
  },
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": { "inject": [], "platform": "web" }
  }
}
```

The manifest `dsh.client.inject` is the **Node-side collection dependency list**, not the browser plugin dependency list. The browser export declares `sessions` separately. `./client` is mandatory: the inspected host resolves the browser asset through the package export, not a guessed filename.

Build prerequisites: Node 22.19+ or 24+, TypeScript, Vite, React/ReactDOM and their type declarations; jsdom and Vitest for adapter tests. No installed DSH peers are needed for compilation because the adapter types only the structural service subset it uses. Browser `react`, `react/jsx-runtime`, `react-dom`, `react-dom/client` stay external and are supplied by DSH's seeded module table. Bundle the renderer and Lucide icons. CSS is injected from the same JS artifact since the host does not load a Vite CSS manifest.

```sh
npm ci
npx tsc --noEmit
npx vitest run src/host/client.test.tsx
npx vite build --config vite.plugin.config.ts --mode host-node
npx vite build --config vite.plugin.config.ts
```

Both builds use `emptyOutDir: false` so the second does not delete the first. Generated assets are not source. The standalone Vite demo is not proof of host integration.

## Exact isolated host test on this Nix machine

Do not run `dsh plugin` without the isolated environment below. No restart, Nix rebuild, write into `/nix/store`, live profile install or port 3080 is needed. Run commands from the plugin checkout. This method reuses read-only installed host modules and needs neither Docker nor downloading another DSH. It does **not** copy live sessions, credentials or home patches.

```sh
set -eu
PLUGIN_ROOT="$PWD"
HOST_ROOT=/nix/store/ljpcc1lmg2qf186bbz5swzc2hn9knff5-deepseek-harness-0.2.1-rc.2/lib/deepseek-harness
TEST_ROOT="$(mktemp -d /tmp/dsh-rich-ui-host.XXXXXX)"
export HOME="$TEST_ROOT/home"
export DSH_HOME="$TEST_ROOT/dsh"
export DSH_AGENTS_HOME="$TEST_ROOT/agents"
export XDG_CONFIG_HOME="$TEST_ROOT/config"
export XDG_CACHE_HOME="$TEST_ROOT/cache"
export XDG_DATA_HOME="$TEST_ROOT/data"
mkdir -p "$HOME" "$DSH_AGENTS_HOME" "$TEST_ROOT/workspace"
printf 'Isolated host root: %s\n' "$TEST_ROOT"
# Initialize shipped web composition without booting a server.
dsh --profile web --dump-config > "$TEST_ROOT/baseline.yml"
# Profile-local symlink only. Core host bundles resolve from installation first.
mkdir -p "$DSH_HOME/profiles/web/node_modules/@kyoukisu"
ln -s "$PLUGIN_ROOT" "$DSH_HOME/profiles/web/node_modules/@kyoukisu/dsh-rich-ui"
# Overlay references the linked package; does not require plugin-manager install.
dsh --profile web --patch "$PLUGIN_ROOT/cordis.patch.yml" --dump-config > "$TEST_ROOT/composed.yml"
# Start from the empty workspace, not the real configuration repository.
cd "$TEST_ROOT/workspace"
dsh --profile web --patch "$PLUGIN_ROOT/cordis.patch.yml" --host 127.0.0.1 --port 3189 --no-open
```

`HOST_ROOT` records provenance; the installed `dsh` executable already selects this store. If `dsh --version` changes, recheck the API before claiming compatibility. `--dump-config` initializes shipped profiles according to the inspected CLI boot contract. The symlink + explicit overlay avoid package-manager lifecycle scripts or profile dependency installation. If port 3189 is occupied, use another unused loopback port; never kill the existing listener. In an agent, run only the final command as a managed background job and record its job ID; stop that job, not a service unit. Treat `$TEST_ROOT` as evidence; do not delete it blindly.

Open **http://127.0.0.1:3189/**, not the production GUI. Check the module ID appears in `window.__DSH_BOOT__` and fetch its exact advertised revision-bound combo URL (for example `/plugins/??@kyoukisu/dsh-rich-ui/client.js&rev=<boot-revision>`). Bare `/plugins/@kyoukisu/dsh-rich-ui` or unversioned URLs return 404 by design. In a fresh test session, ask the configured test model to output exactly:

````text
```rich-ui
{"version":1,"nodes":[{"type":"text","content":"Isolated rich-ui smoke"},{"type":"button","label":"Send test","action":{"type":"send-message","text":"isolated click"}}]}
```
````

If no provider is configured, a manually injected stock-shaped DOM fixture proves discovery/rendering, **not** model/session delivery. Do not copy production credentials merely to finish a smoke test. A complete real-host acceptance checks: rich UI rendered; `[data-rich-ui-root]` exists beside hidden source; malformed JSON stays visible as code; `dsh-ui` and ordinary code remain unchanged; click returns a scoped `[rich-ui-action]` message; refresh/history replay renders again; plugin unload restores original source. Record which checks actually ran.

## Rapid rebuilds against the isolated host

For browser-only work run `npx vite build --config vite.plugin.config.ts --watch` as its own managed background job. This builds the actual host CJS/module-loader artifact, not the standalone demo. The inspected shipped `dsh-client-hmr` polls artifact stat metadata and invokes `clientModules.rebuilt(id)`, replacing immutable bytes and publishing a new graph revision. This was observed on the running isolated host: after rebuilding, the package's advertised revision changed without restarting the host. The browser HMR receiver is present; refresh the isolated URL and verify its advertised revision and served artifact if automatic replacement does not occur. Do not promise hot updates merely because a Vite demo dev server is running.

If a different host lacks `dsh-client-hmr` or the advertised revision stays unchanged, stop and start **only the isolated managed host job**, retaining its isolated environment. Node-half changes need that isolated process restart; browser artifact polling does not re-run the Node plugin. Production service restarts are neither necessary nor authorized.

## Verification performed during implementation

TypeScript check, both real plugin builds, the jsdom adapter tests and one actual-built-bundle VM module-loader test passed. Tests cover strict parsing, real React mounting, streaming settlement, malformed revisions, removed rows, unload restoration and captured-session action routing. A fresh isolated DSH home was booted on loopback port 3189; its GUI loaded successfully in a disposable browser; its boot graph contained this package; its revision-bound module endpoint returned 200 and included the exact built artifact. No production profile/service was changed.

The parent-owned isolated host was then tested using `scripts/host-smoke.mjs` in the Playwright Docker image. The script reads the isolated Netscape cookie jar created by authenticated curl from the disposable launch URL; it never logs auth data. It loads the real host/browser module graph and injects only a stock-shaped assistant DOM fixture. Actual plugin mounting, local switch click plus computed output, malformed JSON fallback, ordinary-code preservation and not claiming dsh-ui all passed. Evidence is `.cache/isolated-host/host-smoke.json` and `host-smoke.png` (scratch, not source). Run with `docker run --rm --network host --ipc=host -v "$PWD:/work" -w /work mcr.microsoft.com/playwright:v1.64.1-noble node scripts/host-smoke.mjs` while the isolated host is running.

A model/session history replay and model-action round trip remain **unproven**: the fresh profile has no model credentials. The fixture is injected DOM, not a stored transcript or a model response. No action delivery is simulated or asserted. Unload restoration is covered by jsdom tests, not a live plugin unload. The isolated host process lifecycle belongs to the task supervisor.

## Limits

- This is a compatibility adapter against observed DOM, not a stable public fence API. Changed labels/classes/assistant markers fail closed to raw code; the integration must be revalidated on host upgrades.
- Only the main viewed session is resolved (`retainedBy.mainView`), mirroring installed genui. Multi-pane/embedded transcript rendering is not guaranteed; no session means local UI only. A later provider disappearance can drop an action.
- Only completed JSON nodes are previewed while streaming; a partially written string or node never renders and the preview stays inert until settlement. The adapter opts into the renderer's safe sessionStorage persistence using owning session + nearest stable chat anchor/node/flow key + **row-local** code-block ordinal. The renderer owns canonical spec hashing/versioning and excludes text input values. Without a stable host anchor the fallback is session + content hash/length: identical unanchored blocks in one session share state, and the compact non-cryptographic hash is not a security identity. Multi-tab durability is not provided.
- A claimed fence that the parser rejects mounts a diagnostic card with the exact error and the rejected source. The card copies both; it sends nothing. A browser plugin has no tool channel, so a repair button could only submit a visible user message. Validation happens in the host `rich_ui_validate` tool before the model emits the fence. A complete schema-teaching skill and compact Node instructions are included; no tool-result renderer, panel dock, or automatic repair loop is installed.
- `conversation.send` queues a normal user message, not an RPC transaction. It can fail or trigger model costs. The adapter logs failure without the payload; no delivery retry or acknowledgement UI is implemented.
- Only the fresh test home is isolated by these commands; this is not a process/filesystem security sandbox. Run in a container separately if untrusted plugin code needs containment.
- Unit DOM tests and build checks are not a live-host acceptance. A running real-host session/action round trip must be reported separately.
