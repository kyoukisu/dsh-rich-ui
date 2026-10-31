// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { explain } from "../ui/Diagnostic";
import {
  actionHandler,
  fencePersistenceKey,
  installDomRenderer,
  parseFence,
  parseFenceResult,
  type ClientContext,
} from "./client";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const sample = {
  version: 1,
  nodes: [{ type: "text", content: "Hello rich UI" }],
};
const ctx = (send = vi.fn().mockResolvedValue(undefined)): ClientContext => ({
  sessions: {
    list: { getSnapshot: () => ({ ids: ["session-one"] }) },
    retainInfo: () => ({
      getSnapshot: () => ({ retainedBy: { mainView: 1 } }),
    }),
    scope: () => ({ get: () => ({ send }) }),
  },
});
let dispose: (() => void) | undefined;
async function tick() {
  await act(async () => {
    // Streaming paints once per animation frame instead of every token.
    await new Promise((resolve) => setTimeout(resolve, 25));
  });
}
/** Mirrors the live harness markup: banner span inside data-code-wrap. */
function source(
  raw = JSON.stringify(sample),
  kind = "assistant-step",
  label = "Code block",
) {
  const row = document.createElement("div");
  row.dataset.chatFlowKind = kind;
  row.dataset.chatAnchorKey = "14:assistant-step15:1";
  const block = document.createElement("div");
  block.className = "md-code-block";
  block.dataset.codeWrap = "true";
  const banner = document.createElement("div");
  banner.dataset.codeBlockBanner = "true";
  const language = document.createElement("span");
  language.className = "_language_1pq26_30";
  language.textContent = label;
  banner.append(language);
  const content = document.createElement("div");
  content.dataset.codeBlockContent = "true";
  const pre = document.createElement("pre");
  pre.textContent = raw;
  content.append(pre);
  block.append(banner, content);
  row.append(block);
  document.body.append(row);
  return { row, block, pre };
}
afterEach(async () => {
  await act(async () => {
    dispose?.();
  });
  dispose = undefined;
  document.body.replaceChildren();
});

describe("diagnostic copy", () => {
  it("explains common validator errors in English", () => {
    expect(explain("Missing value")).toBe('Missing required field "value".');
    expect(explain("Unknown field: colour")).toContain('"colour"');
    expect(explain("Unknown node type")).toContain("Unknown block type");
    expect(explain("Invalid URL")).toContain("Invalid link");
    expect(explain("weird internal failure")).toContain(
      "does not match the schema",
    );
  });
});

describe("strict fence input", () => {
  it("accepts schema-valid strict JSON and rejects malformed, unsafe, oversized data", () => {
    expect(parseFence(JSON.stringify(sample))).not.toBeNull();
    for (const bad of [
      "{",
      "{}",
      '{"__proto__":{}}',
      " ".repeat(256001),
      '{"version":1,"nodes":[{"type":"html","html":"<script>"}]}',
    ]) {
      expect(parseFence(bad)).toBeNull();
    }
  });
  it("returns the validator reason for a claimed but rejected document", () => {
    const result = parseFenceResult('{"version":1,"nodes":[{"type":"text"}]}');
    expect(result.spec).toBeUndefined();
    expect(result.error).toContain("content");
    expect(parseFenceResult(" ".repeat(256001)).error).toContain("256000");
  });
});

describe("installed-host DOM contract", () => {
  it("keys anchored fences by session and row-local ordinal, fallback by content", () => {
    const a = source();
    a.row.dataset.chatAnchorKey = "assistant-step1:0";
    const first = fencePersistenceKey(a.block, "session-one");
    source(); // unrelated global DOM insertions do not change the first identity
    expect(fencePersistenceKey(a.block, "session-one")).toBe(first);
    expect(fencePersistenceKey(a.block, "session-two")).not.toBe(first);
    const sibling = a.block.cloneNode(true) as HTMLElement;
    a.row.append(sibling);
    expect(fencePersistenceKey(sibling, "session-one")).not.toBe(first);
    expect(fencePersistenceKey(a.block)).toBeUndefined();
    delete a.row.dataset.chatAnchorKey;
    const fallback = fencePersistenceKey(a.block, "session-one");
    a.pre.textContent = JSON.stringify({ ...sample, title: "changed" });
    expect(fencePersistenceKey(a.block, "session-one")).not.toBe(fallback);
  });
  it("mounts a real RichResponse, restores raw source on unload", async () => {
    const { block } = source();
    await act(async () => {
      dispose = installDomRenderer(ctx());
    });
    await tick();
    expect(block.hidden).toBe(true);
    expect(
      document.querySelector("[data-rich-ui-root]")?.textContent,
    ).toContain("Hello rich UI");
    await act(async () => {
      dispose?.();
    });
    expect(block.hidden).toBe(false);
    expect(document.querySelector("[data-rich-ui-root]")).toBeNull();
  });
  it("passes durable session/block identity to the real renderer across remounts", async () => {
    sessionStorage.clear();
    const spec = {
      version: 1,
      initialState: { enabled: false },
      nodes: [
        { type: "switch", stateKey: "enabled", label: "Remember selection" },
      ],
    };
    const { row } = source(JSON.stringify(spec));
    row.dataset.chatAnchorKey = "assistant-step4:0";
    await act(async () => {
      dispose = installDomRenderer(ctx());
    });
    await tick();
    const checkbox = row.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    await act(async () => {
      checkbox.click();
    });
    await tick();
    expect(checkbox.checked).toBe(true);
    await act(async () => {
      dispose?.();
    });
    await act(async () => {
      dispose = installDomRenderer(ctx());
    });
    await tick();
    expect(
      (row.querySelector('input[type="checkbox"]') as HTMLInputElement).checked,
    ).toBe(true);
    sessionStorage.clear();
  });
  it("stops retrying a fence whose render throws until its text changes", async () => {
    const original = Object.getOwnPropertyDescriptor(
      globalThis,
      "ResizeObserver",
    );
    let attempts = 0;
    class BrokenObserver {
      constructor() {
        attempts += 1;
        throw new Error("observer failed");
      }
    }
    Object.defineProperty(globalThis, "ResizeObserver", {
      configurable: true,
      writable: true,
      value: BrokenObserver,
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { block, pre } = source(
      JSON.stringify({
        version: 1,
        nodes: [
          { type: "chart", kind: "bar", data: [{ label: "A", value: 1 }] },
        ],
      }),
    );
    dispose = installDomRenderer(ctx());
    await tick();
    await tick();
    await tick();
    expect(block.hidden).toBe(false);
    expect(attempts).toBe(1);
    expect(error).toHaveBeenCalled();

    await act(async () => {
      pre.textContent = JSON.stringify(sample);
    });
    await tick();
    expect(block.hidden).toBe(true);
    expect(
      document.querySelector("[data-rich-ui-root]")?.textContent,
    ).toContain("Hello rich UI");
    if (original) Object.defineProperty(globalThis, "ResizeObserver", original);
    else delete (globalThis as Record<string, unknown>).ResizeObserver;
  });

  it("drops persisted state when the same fence is reassigned to another response", async () => {
    sessionStorage.clear();
    const spec = {
      version: 1,
      initialState: { enabled: false },
      nodes: [
        { type: "switch", stateKey: "enabled", label: "Remember selection" },
      ],
    };
    const { row } = source(JSON.stringify(spec));
    row.dataset.chatAnchorKey = "response-a";
    await act(async () => {
      dispose = installDomRenderer(ctx());
    });
    await tick();
    const checkbox = () =>
      row.querySelector('input[type="checkbox"]') as HTMLInputElement;
    await act(async () => checkbox().click());
    await tick();
    expect(checkbox().checked).toBe(true);
    expect(sessionStorage.length).toBe(1);

    await act(async () => {
      row.dataset.chatAnchorKey = "response-b";
    });
    await tick();
    expect(checkbox().checked).toBe(false);
    await act(async () => checkbox().click());
    await tick();
    expect(sessionStorage.length).toBe(2);
    sessionStorage.clear();
  });

  it("does not mount user fences or incomplete streaming JSON; observes settlement", async () => {
    const user = source(JSON.stringify(sample), "user");
    const assistant = source("{");
    assistant.row.dataset.streaming = "";
    dispose = installDomRenderer(ctx());
    await tick();
    expect(document.querySelector("[data-rich-ui-root]")).toBeNull();
    await act(async () => {
      assistant.pre.textContent = JSON.stringify(sample);
      delete assistant.row.dataset.streaming;
    });
    await tick();
    expect(assistant.block.hidden).toBe(true);
    expect(user.block.hidden).toBe(false);
  });
  it("replaces a rejected revision with a diagnostic, then recovers on a valid one", async () => {
    const { row, block, pre } = source();
    await act(async () => {
      dispose = installDomRenderer(ctx());
    });
    await tick();
    await act(async () => {
      pre.textContent = '{"version":1,"nodes":[{"type":"text"}]}';
    });
    await tick();
    expect(block.hidden).toBe(true);
    expect(document.querySelector(".ru-diagnostic")).not.toBeNull();
    expect(
      document.querySelector(".ru-diagnostic-error")?.textContent,
    ).toContain("content");
    await act(async () => {
      pre.textContent = JSON.stringify(sample);
    });
    await tick();
    expect(document.querySelector(".ru-diagnostic")).toBeNull();
    expect(
      document.querySelector("[data-rich-ui-root]")?.textContent,
    ).toContain("Hello rich UI");
    await act(async () => {
      row.remove();
    });
    await tick();
    expect(row.querySelector("[data-rich-ui-root]")).toBeNull();
  });
  it("keeps rejected source local: no automatic or click-driven repair message", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const { block } = source(
      '{"version":1,"nodes":[{"type":"text"}]}',
      "assistant-step",
      "rich-ui",
    );
    dispose = installDomRenderer(ctx(send));
    await tick();
    expect(block.hidden).toBe(true);
    expect(send).not.toHaveBeenCalled();
    const buttons = [
      ...document.querySelectorAll<HTMLButtonElement>(".ru-diagnostic button"),
    ];
    expect(buttons.map((button) => button.textContent?.trim())).toEqual([
      "Copy error",
    ]);
    await act(async () => {
      buttons[0]!.click();
    });
    await tick();
    expect(send).not.toHaveBeenCalled();
  });
  it("keeps an unfinished malformed stream as native code", async () => {
    const { row, block } = source("{", "assistant-step", "rich-ui");
    row.dataset.streaming = "true";
    dispose = installDomRenderer(ctx());
    await tick();
    expect(document.querySelector(".ru-diagnostic")).toBeNull();
    expect(block.hidden).toBe(false);
  });
  it("sends an action through the captured scoped conversation, not current UI routing", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const context = ctx(send);
    const scope = vi.spyOn(context.sessions, "scope");
    actionHandler(context, "original-session")?.("refresh", { query: "hello" });
    expect(scope).toHaveBeenCalledWith("original-session");
    expect(send).toHaveBeenCalledWith(
      '[rich-ui-action] {"action":"refresh","payload":{"query":"hello"}}',
    );
    expect(actionHandler(context)).toBeUndefined();
    actionHandler(context, "x")?.("a".repeat(257));
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe("live fence label rules", () => {
  it("renders an unlabeled fence whose payload is a spec document", async () => {
    const { block } = source(
      JSON.stringify(sample),
      "assistant-step",
      "Code block",
    );
    dispose = installDomRenderer(ctx());
    await tick();
    expect(document.querySelector("[data-rich-ui-root]")).not.toBeNull();
    expect(block.hidden).toBe(true);
  });
  it("recognizes a valid spec whose version is not the first key", async () => {
    const { block } = source(
      JSON.stringify({ nodes: sample.nodes, version: 1 }),
      "assistant-step",
      "Code block",
    );
    dispose = installDomRenderer(ctx());
    await tick();
    expect(block.hidden).toBe(true);
    expect(document.querySelector("[data-rich-ui-root]")).not.toBeNull();
  });
  it("re-hides the source when the host resets its hidden attribute", async () => {
    const { block } = source();
    dispose = installDomRenderer(ctx());
    await tick();
    expect(block.hidden).toBe(true);
    block.hidden = false;
    await tick();
    expect(block.hidden).toBe(true);
  });
  it("keeps an explicitly labelled json block as code even if it parses", async () => {
    const { block } = source(JSON.stringify(sample), "assistant-step", "json");
    dispose = installDomRenderer(ctx());
    await tick();
    expect(document.querySelector("[data-rich-ui-root]")).toBeNull();
    expect(block.hidden).toBe(false);
  });
  it("keeps an unlabeled block whose payload is ordinary JSON", async () => {
    const { block } = source('{"hello":1}', "assistant-step", "Code block");
    dispose = installDomRenderer(ctx());
    await tick();
    expect(document.querySelector("[data-rich-ui-root]")).toBeNull();
    expect(block.hidden).toBe(false);
  });
  it("still accepts the explicit rich-ui label", async () => {
    source(JSON.stringify(sample), "assistant-step", "rich-ui");
    dispose = installDomRenderer(ctx());
    await tick();
    expect(document.querySelector("[data-rich-ui-root]")).not.toBeNull();
  });
});

describe("streaming preview", () => {
  it("mounts completed nodes inert, then activates when the block settles", async () => {
    const partial =
      '{"version":1,"nodes":[{"type":"text","content":"First paragraph"},{"type":"call';
    const { row, block, pre } = source(partial, "assistant-step", "Code block");
    row.dataset.streaming = "true";
    dispose = installDomRenderer(ctx());
    await tick();
    const container = document.querySelector<HTMLElement>(
      "[data-rich-ui-root]",
    );
    expect(container).not.toBeNull();
    expect(container!.hasAttribute("inert")).toBe(true);
    expect(container!.textContent).toContain("First paragraph");
    expect(block.hidden).toBe(true);

    delete row.dataset.streaming;
    pre.textContent = JSON.stringify({
      version: 1,
      nodes: [
        { type: "text", content: "First paragraph" },
        { type: "text", content: "Second" },
      ],
    });
    await tick();
    const settled = document.querySelector<HTMLElement>("[data-rich-ui-root]");
    expect(settled).not.toBeNull();
    expect(settled!.hasAttribute("inert")).toBe(false);
    expect(settled!.textContent).toContain("Second");
  });
  it("reuses one rich root while a streamed document keeps changing", async () => {
    const { row, pre } = source(
      '{"version":1,"nodes":[{"type":"text","content":"First"}]}',
      "assistant-step",
      "Code block",
    );
    row.dataset.streaming = "true";
    dispose = installDomRenderer(ctx());
    await tick();
    const first = document.querySelector("[data-rich-ui-root]");
    expect(first).not.toBeNull();
    pre.textContent =
      '{"version":1,"nodes":[{"type":"text","content":"Second"}]}';
    await tick();
    const second = document.querySelector("[data-rich-ui-root]");
    expect(second).toBe(first);
    expect(second?.textContent).toContain("Second");
  });

  it("does not preview a stream above the source-size cap", async () => {
    const { row, block } = source(
      `{"version":1,"nodes":[{"type":"text","content":"${"x".repeat(256001)}"}]}`,
      "assistant-step",
      "Code block",
    );
    row.dataset.streaming = "true";
    dispose = installDomRenderer(ctx());
    await tick();
    expect(document.querySelector("[data-rich-ui-root]")).toBeNull();
    expect(block.hidden).toBe(false);
  });

  it("keeps the source visible while no complete node exists", async () => {
    const { row, block } = source(
      '{"version":1,"nodes":[{"type":"te',
      "assistant-step",
      "Code block",
    );
    row.dataset.streaming = "true";
    dispose = installDomRenderer(ctx());
    await tick();
    expect(document.querySelector("[data-rich-ui-root]")).toBeNull();
    expect(block.hidden).toBe(false);
  });
});
