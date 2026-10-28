// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RichResponse } from "../../src/ui/RichResponse";
import { type RichSpec } from "../../src/core/schema";

let host: HTMLDivElement;
let root: Root;
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  document.body.style.overflow = "";
  vi.restoreAllMocks();
});
const click = (el: Element) =>
  act(() => el.dispatchEvent(new MouseEvent("click", { bubbles: true })));
const button = (text: string) =>
  Array.from(document.querySelectorAll("button")).find((b) =>
    b.textContent?.includes(text),
  )!;
const division = { op: "div" as const, args: [1, 0] };
describe("RichResponse regressions", () => {
  it("isolates failed expressions and charts without losing healthy content", () => {
    const spec: RichSpec = {
      version: 1,
      nodes: [
        { type: "computed", expr: division },
        {
          type: "chart",
          kind: "bar",
          data: [{ label: "bad", value: { op: "div", args: [1, 0] } }],
        },
        { type: "text", content: "Healthy sibling" },
      ],
    };
    act(() => root.render(<RichResponse spec={spec} />));
    expect(host.textContent).toContain("Healthy sibling");
    expect(host.querySelectorAll('[role="alert"]')).toHaveLength(2);
  });
  it("reports failed actions without unhandled rejection or state corruption", async () => {
    const spec: RichSpec = {
      version: 1,
      initialState: { x: 4 },
      nodes: [
        {
          type: "button",
          label: "Bad set",
          action: { type: "set", key: "x", value: division },
        },
        { type: "computed", expr: { state: "x" } },
      ],
    };
    act(() => root.render(<RichResponse spec={spec} />));
    await act(async () => {
      button("Bad set").click();
    });
    expect(host.querySelector('[role="status"]')?.textContent).toContain(
      "Не удалось выполнить",
    );
    expect(host.querySelector("output")?.textContent).toBe("4");
  });
  it("keeps scalar select options distinct despite equal string representations", () => {
    const spec: RichSpec = {
      version: 1,
      initialState: { value: 1 },
      nodes: [
        {
          type: "select",
          stateKey: "value",
          options: [
            { label: "Number", value: 1 },
            { label: "String", value: "1" },
          ],
        },
        {
          type: "computed",
          expr: { op: "eq", args: [{ state: "value" }, "1"] },
        },
      ],
    };
    act(() => root.render(<RichResponse spec={spec} />));
    const select = host.querySelector("select")!;
    act(() => {
      select.value = "1";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(host.querySelector("output")?.textContent).toBe("true");
  });
  it("preserves panel focus on parent state changes and restores opener on Escape", () => {
    const spec: RichSpec = {
      version: 1,
      nodes: [
        { type: "entity-ref", entityId: "one" },
        {
          type: "button",
          label: "Update background",
          action: { type: "toggle", key: "x" },
        },
      ],
      entities: [
        { id: "one", kind: "test", title: "One", related: ["two"] },
        { id: "two", kind: "test", title: "Two" },
      ],
    };
    act(() => root.render(<RichResponse spec={spec} detailMode="modal" />));
    const opener = button("One");
    opener.focus();
    click(opener);
    const related = button("Two");
    related.focus();
    click(button("Update background"));
    expect(document.activeElement).toBe(related);
    expect(document.body.style.overflow).toBe("hidden");
    act(() =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      ),
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(document.body.style.overflow).toBe("");
  });
  it("recaptures escaped keyboard focus and wraps backward in the modal", () => {
    const spec: RichSpec = {
      version: 1,
      nodes: [{ type: "entity-ref", entityId: "one" }],
      entities: [
        {
          id: "one",
          kind: "test",
          title: "One",
          sources: [{ title: "Source", url: "https://example.org" }],
        },
      ],
    };
    act(() => root.render(<RichResponse spec={spec} detailMode="modal" />));
    const opener = button("One");
    click(opener);
    opener.focus();
    act(() =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Tab",
          bubbles: true,
          cancelable: true,
        }),
      ),
    );
    const close = document.querySelector('[aria-label="Закрыть подробности"]');
    expect(document.activeElement).toBe(close);
    act(() =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Tab",
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        }),
      ),
    );
    expect(document.activeElement).toBe(document.querySelector(".ru-source"));
  });
  it("defaults desktop to a non-modal drawer without locking background or trapping focus", () => {
    const spec: RichSpec = {
      version: 1,
      nodes: [{ type: "entity-ref", entityId: "one" }],
      entities: [{ id: "one", kind: "test", title: "One" }],
    };
    act(() => root.render(<RichResponse spec={spec} />));
    const opener = button("One");
    opener.focus();
    click(opener);
    const panel = document.querySelector('[role="complementary"]')!;
    expect(panel).not.toBeNull();
    expect(panel.hasAttribute("aria-modal")).toBe(false);
    expect(document.body.style.overflow).toBe("");
    expect(document.activeElement).toBe(opener);
    const tab = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    act(() => document.dispatchEvent(tab));
    expect(tab.defaultPrevented).toBe(false);
    act(() =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      ),
    );
    expect(document.querySelector('[role="complementary"]')).not.toBeNull();
    (panel.querySelector("button") as HTMLElement).focus();
    act(() =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      ),
    );
    expect(document.querySelector('[role="complementary"]')).toBeNull();
  });
  it("keeps Escape operational after related entity navigation removes the focused button", () => {
    const spec: RichSpec = {
      version: 1,
      nodes: [{ type: "entity-ref", entityId: "one" }],
      entities: [
        { id: "one", kind: "test", title: "One", related: ["two"] },
        { id: "two", kind: "test", title: "Two" },
      ],
    };
    act(() => root.render(<RichResponse spec={spec} />));
    const opener = button("One");
    opener.focus();
    click(opener);
    const related = button("Two");
    related.focus();
    click(related);
    expect(document.activeElement).toBe(
      document.querySelector('[aria-label="Закрыть подробности"]'),
    );
    expect(document.querySelector(".ru-detail h2")?.textContent).toBe("Two");
    act(() =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      ),
    );
    expect(document.querySelector(".ru-detail")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
  it("uses a modal sheet on mobile even in default drawer mode", () => {
    const original = window.matchMedia;
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => ({
        matches: true,
        addEventListener() {},
        removeEventListener() {},
      }),
    });
    try {
      const spec: RichSpec = {
        version: 1,
        nodes: [{ type: "entity-ref", entityId: "one" }],
        entities: [{ id: "one", kind: "test", title: "One" }],
      };
      act(() => root.render(<RichResponse spec={spec} />));
      click(button("One"));
      expect(
        document.querySelector('[role="dialog"]')?.getAttribute("aria-modal"),
      ).toBe("true");
      expect(document.body.style.overflow).toBe("hidden");
    } finally {
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        value: original,
      });
    }
  });
  it("preserves poster layout classes on failed entity images", () => {
    const spec: RichSpec = {
      version: 1,
      nodes: [{ type: "entity-ref", entityId: "one" }],
      entities: [
        {
          id: "one",
          kind: "test",
          title: "One",
          image: "https://example.org/poster.jpg",
        },
      ],
    };
    act(() => root.render(<RichResponse spec={spec} />));
    act(() => host.querySelector("img")!.dispatchEvent(new Event("error")));
    expect(
      host.querySelector(".ru-image-fallback")?.classList.contains("ru-poster"),
    ).toBe(true);
  });
  it("carries local dark/auto theme into body portal and tracks changes", async () => {
    const spec: RichSpec = {
      version: 1,
      nodes: [{ type: "entity-ref", entityId: "one" }],
      entities: [{ id: "one", kind: "test", title: "One" }],
    };
    host.dataset.theme = "dark";
    act(() => root.render(<RichResponse spec={spec} />));
    click(button("One"));
    expect(
      document.querySelector(".ru-overlay")?.getAttribute("data-theme"),
    ).toBe("dark");
    await act(async () => {
      host.dataset.theme = "auto";
      await Promise.resolve();
    });
    expect(
      document.querySelector(".ru-overlay")?.getAttribute("data-theme"),
    ).toBe("auto");
  });
});
