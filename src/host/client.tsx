import { Component, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { RichResponse } from "../ui/RichResponse";
import { parseStreamingSpec } from "./partial.ts";
import { parseRichSpec, type RichSpec } from "../core/schema";

export const name = "@kyoukisu/dsh-rich-ui";
export const inject = ["sessions"];

/** Structural subset of the installed session-controller/conversation services. */
export interface ClientContext {
  sessions: {
    list: { getSnapshot(): { ids: readonly string[] } };
    retainInfo(id: string): {
      getSnapshot(): { retainedBy: { mainView?: number } };
    };
    scope(id: string): { get(key: string): unknown } | undefined;
  };
}
export type ActionHandler = (
  action: string,
  payload?: Record<string, unknown>,
) => void;

const surfaces = ".md-code-block, .code-block, .code-block-small";
const own = "[data-rich-ui-root]";
const maxSourceLength = 256_000;

/** Strict JSON only: no eval, repair, executable payloads or partial rendering. */
export function parseFence(raw: string): RichSpec | null {
  if (raw.length > maxSourceLength) return null;
  try {
    const value: unknown = JSON.parse(raw, (key, item: unknown) => {
      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        throw new Error("Unsafe JSON key");
      }
      return item;
    });
    return parseRichSpec(value);
  } catch {
    return null;
  }
}

class RenderBoundary extends Component<
  {
    children: ReactNode;
    onFailure: () => void;
  },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

interface Mount {
  container: HTMLElement;
  root: Root;
  raw: string;
  hidden: boolean;
  streaming: boolean;
  spec: string;
  sessionId?: string;
  failed?: boolean;
}

function viewedSession(ctx: ClientContext): string | undefined {
  return ctx.sessions.list
    .getSnapshot()
    .ids.find(
      (id) =>
        (ctx.sessions.retainInfo(id).getSnapshot().retainedBy.mainView ?? 0) >
        0,
    );
}

/** Stable scope identity; schema/content-version hashing remains the renderer's job. */
export function fencePersistenceKey(
  source: HTMLElement,
  sessionId?: string,
): string | undefined {
  if (!sessionId) return undefined;
  const row = source.closest('[data-chat-flow-kind="assistant-step"]');
  const owner = source.closest(
    "[data-chat-anchor-key], [data-chat-node-key], [data-chat-flow-key]",
  );
  const anchor =
    owner?.getAttribute("data-chat-anchor-key") ??
    owner?.getAttribute("data-chat-node-key") ??
    owner?.getAttribute("data-chat-flow-key");
  if (anchor && row) {
    const blocks = [...row.querySelectorAll<HTMLElement>(surfaces)].filter(
      (block) => !block.closest(own) && !block.parentElement?.closest(surfaces),
    );
    const ordinal = blocks.indexOf(source);
    if (ordinal >= 0)
      return JSON.stringify(["rich-ui", sessionId, anchor, ordinal]);
  }
  // Content identity is the conservative fallback: no document-global ordinal.
  // Equal content in the same session shares state when host supplies no anchor.
  const raw =
    (
      source.querySelector("pre") ??
      source.querySelector("[data-code-block-content]")
    )?.textContent ?? "";
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++)
    hash = Math.imul(hash ^ raw.charCodeAt(i), 16777619);
  return JSON.stringify([
    "rich-ui",
    sessionId,
    "content",
    raw.length,
    (hash >>> 0).toString(16),
  ]);
}

/**
 * The harness replaces an unrecognized fence language with its localized
 * "Code block" heading, so the literal `rich-ui` label is not visible for a
 * plain ```rich-ui fence. Discovery therefore combines the banner label with a
 * strict payload signature:
 *   - explicit single-token language other than `rich-ui` => never claim it;
 *   - explicit `rich-ui` => claim it;
 *   - generic/absent label => claim only a payload that starts like a spec
 *     document, which the strict parser still has to accept.
 * Ordinary JSON code blocks keep rendering as code.
 */
export function isRichFence(
  source: HTMLElement,
  body: HTMLElement,
  raw: string,
): boolean {
  const banner = source.querySelector("[data-code-block-banner]");
  const label =
    [...(banner ?? source).querySelectorAll("*")]
      .filter((element) => !body.contains(element))
      .filter((element) => element.children.length === 0)
      .map((element) => element.textContent?.trim() ?? "")
      .find((text) => text.length > 0) ?? "";
  const token = label.toLowerCase();
  if (/^[a-z0-9+#._-]{1,24}$/.test(token)) return token === "rich-ui";
  return /^\{\s*"version"\s*:\s*1\s*,/.test(raw.trimStart());
}

/** Captures the session when the fence mounts, never at the later click. */
export function actionHandler(
  ctx: ClientContext,
  sessionId?: string,
): ActionHandler | undefined {
  if (!sessionId) return undefined;
  return (action, payload = {}) => {
    if (
      typeof action !== "string" ||
      action.length === 0 ||
      action.length > 256
    )
      return;
    const conversation = ctx.sessions.scope(sessionId)?.get("conversation") as
      { send?: (text: string) => Promise<unknown> } | undefined;
    if (!conversation?.send) return;
    let text: string;
    try {
      text = `[rich-ui-action] ${JSON.stringify({ action, payload })}`;
    } catch {
      return;
    }
    if (text.length > 32_000) return;
    // Do not log payloads: form values can contain private information.
    void conversation
      .send(text)
      .catch(() => console.warn("[rich-ui] Action delivery failed"));
  };
}

/** DOM channel follows the stock genui technique; no host/root slot replacement. */
export function installDomRenderer(
  ctx: ClientContext,
  scope: HTMLElement = document.body,
): () => void {
  const mounts = new Map<HTMLElement, Mount>();
  let disposed = false;
  let scheduled = false;
  const remove = (source: HTMLElement, mount: Mount) => {
    mount.root.unmount();
    mount.container.remove();
    source.hidden = mount.hidden;
    mounts.delete(source);
  };
  const scan = () => {
    scheduled = false;
    if (disposed) return;
    for (const [source, mount] of mounts) {
      if (!scope.contains(source)) remove(source, mount);
    }
    const candidates = new Set(scope.querySelectorAll<HTMLElement>(surfaces));
    for (const body of scope.querySelectorAll<HTMLElement>(
      "[data-code-block-content]",
    )) {
      if (body.parentElement) candidates.add(body.parentElement);
    }
    for (const source of candidates) {
      if (
        source.closest(own) ||
        !source.closest('[data-chat-flow-kind="assistant-step"]')
      )
        continue;
      const body =
        source.querySelector("pre") ??
        source.querySelector("[data-code-block-content]");
      if (!body) continue;
      const mount = mounts.get(source);
      const raw = body.textContent ?? "";
      if (!isRichFence(source, body, raw)) {
        if (mount) remove(source, mount);
        continue;
      }
      // While the model is still writing, show only nodes whose JSON is fully
      // closed and that validate; the preview stays inert until it settles.
      const streaming = Boolean(source.closest("[data-streaming]"));
      const spec = streaming ? parseStreamingSpec(raw) : parseFence(raw);
      if (!spec) {
        if (mount) remove(source, mount);
        continue;
      }
      const sessionId = viewedSession(ctx);
      const specKey = JSON.stringify(spec);
      if (
        mount?.raw === raw &&
        mount.sessionId === sessionId &&
        mount.spec === specKey &&
        mount.streaming === streaming
      ) {
        // Host reconciliation may remove the foreign sibling or reset hidden.
        if (source.nextSibling !== mount.container)
          source.after(mount.container);
        if (!mount.failed && !source.hidden) source.hidden = true;
        continue;
      }
      if (mount) remove(source, mount);
      const container = document.createElement("div");
      container.dataset.richUiRoot = "";
      if (streaming) container.setAttribute("inert", "");
      const root = createRoot(container);
      const next: Mount = {
        container,
        root,
        raw,
        hidden: source.hidden,
        streaming,
        spec: specKey,
        sessionId,
      };
      mounts.set(source, next);
      source.after(container);
      source.hidden = true;
      root.render(
        createElement(RenderBoundary, {
          key: `${raw}:${streaming}`,
          onFailure: () => {
            next.failed = true;
            source.hidden = next.hidden;
          },
          children: createElement(RichResponse, {
            spec,
            // Actions and durable state begin only once the block is complete.
            persistenceKey: streaming
              ? undefined
              : fencePersistenceKey(source, sessionId),
            onAction: streaming ? undefined : actionHandler(ctx, sessionId),
          }),
        }),
      );
    }
  };
  const observer = new MutationObserver((records) => {
    if (
      records.every((record) =>
        (record.target instanceof Element
          ? record.target
          : record.target.parentElement
        )?.closest(own),
      )
    )
      return;
    if (!scheduled && !disposed) {
      scheduled = true;
      queueMicrotask(scan);
    }
  });
  observer.observe(scope, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["data-streaming"],
  });
  scan();
  return () => {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
    for (const [source, mount] of mounts) remove(source, mount);
  };
}

export function apply(ctx: ClientContext): () => void {
  return installDomRenderer(ctx);
}
