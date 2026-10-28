// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import {
  actionHandler,
  fencePersistenceKey,
  installDomRenderer,
  parseFence,
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
    await new Promise((resolve) => setTimeout(resolve, 0));
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
  it("restores invalid revisions and unmounts removed message roots", async () => {
    const { row, block, pre } = source();
    await act(async () => {
      dispose = installDomRenderer(ctx());
    });
    await tick();
    await act(async () => {
      pre.textContent = "{";
    });
    await tick();
    expect(block.hidden).toBe(false);
    expect(document.querySelector("[data-rich-ui-root]")).toBeNull();
    await act(async () => {
      pre.textContent = JSON.stringify(sample);
    });
    await tick();
    await act(async () => {
      row.remove();
    });
    await tick();
    expect(row.querySelector("[data-rich-ui-root]")).toBeNull();
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
