import { Component, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { RichResponse } from "../ui/RichResponse";
import { Diagnostic } from "../ui/Diagnostic";
import {
  installEntityTab,
  openEntityInSidebar,
  type EntityTabHandle,
} from "./entity-tab";
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
  /** Native right column; absent on hosts without it, which keeps the drawer. */
  sidebarRight?: {
    openTab(kind: string, options?: { params?: unknown }): void;
  };
  /** Dynamic service lookup, used to wait for the optional right column. */
  inject?(
    names: string[],
    callback: (injected: { get(name: string): unknown }) => void,
  ): (() => void) | void;
}
export type ActionHandler = (
  action: string,
  payload?: Record<string, unknown>,
) => void;

const surfaces = ".md-code-block, .code-block, .code-block-small";
const own = "[data-rich-ui-root]";
const maxSourceLength = 256_000;

export type FenceResult =
  { spec: RichSpec; error?: undefined } | { spec?: undefined; error: string };

/** Strict JSON only: no eval, repair, executable payloads or partial rendering.
 * The rejection reason is returned verbatim so the UI can explain it and the
 * reader can send it back to the model. */
export function parseFenceResult(raw: string): FenceResult {
  if (raw.length > maxSourceLength)
    return { error: `Document is longer than ${maxSourceLength} characters` };
  try {
    const value: unknown = JSON.parse(raw, (key, item: unknown) => {
      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        throw new Error("Unsafe JSON key");
      }
      return item;
    });
    return { spec: parseRichSpec(value) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: message.slice(0, 500) };
  }
}

export function parseFence(raw: string): RichSpec | null {
  return parseFenceResult(raw).spec ?? null;
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
  mode: "rich" | "diagnostic";
  error?: string;
  sessionId?: string;
  /** Row anchor plus ordinal; a recycled DOM fence belongs to a new response. */
  owner?: string;
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

/** Identity of the response row that owns a fence, independent of its content. */
export function fenceOwnerKey(source: HTMLElement): string | undefined {
  const row = source.closest('[data-chat-flow-kind="assistant-step"]');
  const owner = source.closest(
    "[data-chat-anchor-key], [data-chat-node-key], [data-chat-flow-key]",
  );
  const anchor =
    owner?.getAttribute("data-chat-anchor-key") ??
    owner?.getAttribute("data-chat-node-key") ??
    owner?.getAttribute("data-chat-flow-key");
  if (!anchor || !row) return undefined;
  const blocks = [...row.querySelectorAll<HTMLElement>(surfaces)].filter(
    (block) => !block.closest(own) && !block.parentElement?.closest(surfaces),
  );
  const ordinal = blocks.indexOf(source);
  return ordinal >= 0 ? `${anchor}\u0000${ordinal}` : undefined;
}

/** Stable scope identity; schema/content-version hashing remains the renderer's job. */
export function fencePersistenceKey(
  source: HTMLElement,
  sessionId?: string,
): string | undefined {
  if (!sessionId) return undefined;
  const owner = fenceOwnerKey(source);
  if (owner) {
    const [anchor, ordinal] = owner.split("\u0000");
    return JSON.stringify(["rich-ui", sessionId, anchor, Number(ordinal)]);
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
  // The host replaces an unknown fence language with a generic localized
  // label, so the payload has to identify itself. Key order is irrelevant;
  // ordinary JSON code blocks still stay code because they fail this check.
  const payload = raw.trimStart();
  if (/^\{\s*"version"\s*:\s*1\s*,/.test(payload)) return true;
  return looksLikeSpec(payload);
}

const SPEC_LOOKUP = new Map<string, boolean>();
/** Bounded cache: the scanner sees the same fence on every mutation. */
function looksLikeSpec(raw: string): boolean {
  // A partial streaming document is not valid JSON; skip the parse until the
  // closing brace appears so a long stream does not re-parse on every token.
  if (
    !raw.startsWith("{") ||
    !raw.trimEnd().endsWith("}") ||
    raw.length > 256_000
  )
    return false;
  const cached = SPEC_LOOKUP.get(raw);
  if (cached !== undefined) return cached;
  let result = false;
  try {
    const value: unknown = JSON.parse(raw);
    result =
      Boolean(value) &&
      typeof value === "object" &&
      (value as { version?: unknown }).version === 1 &&
      Array.isArray((value as { nodes?: unknown }).nodes);
  } catch {
    result = false;
  }
  if (SPEC_LOOKUP.size >= 32) {
    const oldest = SPEC_LOOKUP.keys().next().value;
    if (oldest !== undefined) SPEC_LOOKUP.delete(oldest);
  }
  SPEC_LOOKUP.set(raw, result);
  return result;
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
  getSidebar?: () => ClientContext["sidebarRight"],
  entityTabReady?: () => boolean,
): () => void {
  const mounts = new Map<HTMLElement, Mount>();
  let disposed = false;
  let scheduled = false;
  const remove = (source: HTMLElement, mount: Mount) => {
    try {
      mount.root.unmount();
    } catch {
      /* A boundary that failed during render may already be detached. */
    }
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
      const sessionId = viewedSession(ctx);
      const owner = fenceOwnerKey(source);
      // A failed child stays represented by its source until the document text
      // changes. Recreating the same failing tree would loop forever and make a
      // transient render error look like a flickering answer.
      if (
        mount?.failed &&
        mount.raw === raw &&
        mount.sessionId === sessionId &&
        mount.streaming === streaming &&
        mount.owner === owner
      ) {
        if (source.hidden) source.hidden = false;
        continue;
      }
      // Every streamed token mutates the DOM. Reuse the exact parsed result
      // when the text did not change; hidden/sibling repairs still run.
      if (
        mount &&
        mount.raw === raw &&
        mount.sessionId === sessionId &&
        mount.streaming === streaming &&
        mount.owner === owner &&
        !mount.failed
      ) {
        if (source.nextSibling !== mount.container)
          source.after(mount.container);
        if (!source.hidden) source.hidden = true;
        continue;
      }
      let spec: RichSpec | null = null;
      let error: string | undefined;
      if (streaming && raw.length <= maxSourceLength)
        spec = parseStreamingSpec(raw);
      else {
        const result = parseFenceResult(raw);
        spec = result.spec ?? null;
        error = result.error;
      }
      // An unfinished stream stays native code: the model may still close it.
      if (!spec && streaming) {
        if (mount) remove(source, mount);
        continue;
      }
      const mode: Mount["mode"] = spec ? "rich" : "diagnostic";
      if (
        mount &&
        mount.mode === mode &&
        !mount.failed &&
        mount.raw === raw &&
        mount.sessionId === sessionId &&
        mount.streaming === streaming &&
        mount.owner === owner
      ) {
        // Host reconciliation may remove the foreign sibling or reset hidden.
        if (source.nextSibling !== mount.container)
          source.after(mount.container);
        if (!source.hidden) source.hidden = true;
        continue;
      }
      const paint = (target: Mount) => {
        if (streaming) target.container.setAttribute("inert", "");
        else target.container.removeAttribute("inert");
        if (spec) {
          target.root.render(
            createElement(RenderBoundary, {
              onFailure: () => {
                target.failed = true;
                target.container.hidden = true;
                source.hidden = target.hidden;
              },
              children: createElement(RichResponse, {
                spec,
                parsedSpec: spec,
                preview: streaming,
                // Actions and durable state begin only once the block is complete.
                persistenceKey: streaming
                  ? undefined
                  : fencePersistenceKey(source, sessionId),
                onAction: streaming ? undefined : actionHandler(ctx, sessionId),
                onOpenEntity: streaming
                  ? undefined
                  : (entity, entities) =>
                      openEntityInSidebar(
                        { sidebarRight: getSidebar?.() },
                        entity,
                        entities,
                        entityTabReady,
                      ),
              }),
            }),
          );
        } else {
          const reason = error ?? "Invalid document";
          target.root.render(
            createElement(Diagnostic, {
              key: `${reason}:${raw}`,
              error: reason,
              source: raw,
            }),
          );
        }
      };
      // Keep one root per fence. A streaming block changes on every token; a
      // remount there recreates the whole tree and restarts every animation.
      if (mount && mount.mode === mode && !mount.failed) {
        mount.raw = raw;
        mount.sessionId = sessionId;
        mount.streaming = streaming;
        mount.error = error;
        mount.owner = owner;
        if (source.nextSibling !== mount.container)
          source.after(mount.container);
        if (!source.hidden) source.hidden = true;
        paint(mount);
        continue;
      }
      if (mount) remove(source, mount);
      const container = document.createElement("div");
      container.dataset.richUiRoot = "";
      const root = createRoot(container);
      const next: Mount = {
        container,
        root,
        raw,
        hidden: source.hidden,
        streaming,
        mode,
        error,
        sessionId,
        owner,
      };
      mounts.set(source, next);
      source.after(container);
      source.hidden = true;
      paint(next);
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
      // During streaming the host writes on every token. One paint per frame
      // keeps parse/layout work bounded without delaying the settled block.
      if (scope.querySelector("[data-streaming]")) {
        if (typeof requestAnimationFrame === "function")
          requestAnimationFrame(scan);
        else setTimeout(scan, 16);
      } else queueMicrotask(scan);
    }
  });
  observer.observe(scope, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: [
      "data-streaming",
      "hidden",
      "data-chat-anchor-key",
      "data-chat-node-key",
      "data-chat-flow-key",
    ],
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
  const services: { sidebar?: ClientContext["sidebarRight"] } = {};
  const seat = ctx.inject?.(["sidebarRight"], (injected) => {
    services.sidebar = injected.get("sidebarRight") as
      ClientContext["sidebarRight"] | undefined;
  });
  let entityTab: EntityTabHandle | undefined;
  // Slots are optional: a host without them keeps the in-page drawer.
  const seatSlots = ctx.inject?.(["slots"], (injected) => {
    const slots = injected.get("slots") as
      Parameters<typeof installEntityTab>[0]["slots"] | undefined;
    if (!slots) return;
    entityTab?.dispose();
    entityTab = undefined;
    try {
      entityTab = installEntityTab(
        {
          inject: (names, callback) =>
            ctx.inject ? ctx.inject(names, callback) : undefined,
          slots,
        },
        () => services.sidebar,
      );
    } catch (error) {
      console.warn("[rich-ui] right sidebar unavailable", error);
    }
  });
  const dispose = installDomRenderer(
    ctx,
    document.body,
    () => services.sidebar,
    () => entityTab?.ready() ?? false,
  );
  return () => {
    seat?.();
    seatSlots?.();
    entityTab?.dispose();
    entityTab = undefined;
    dispose();
  };
}
