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
  it("defaults desktop to a non-modal drawer: no lock, no trap, Escape closes", () => {
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
    // A drawer that never takes focus leaves Escape dead, so the caret moves
    // into the panel without locking the page or trapping Tab.
    expect(panel.contains(document.activeElement)).toBe(true);
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
    expect(document.querySelector('[role="complementary"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
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

describe("dashboard vocabulary", () => {
  it("sorts a table locally and reports the sort direction", () => {
    const spec: RichSpec = {
      version: 1,
      nodes: [
        {
          type: "table",
          sortable: true,
          columns: [
            { key: "name", label: "Name" },
            { key: "value", label: "Value", align: "right" },
          ],
          rows: [
            { name: "Beta", value: 20 },
            { name: "Alpha", value: 10 },
          ],
        },
      ],
    };
    act(() => root.render(<RichResponse spec={spec} />));
    const first = () => host.querySelector("tbody tr td")?.textContent;
    expect(first()).toBe("Beta");
    const header = Array.from(host.querySelectorAll("th")).find((cell) =>
      cell.textContent?.includes("Value"),
    )!;
    click(header.querySelector("button")!);
    expect(first()).toBe("Alpha");
    expect(header.getAttribute("aria-sort")).toBe("ascending");
    click(header.querySelector("button")!);
    expect(first()).toBe("Beta");
    expect(header.getAttribute("aria-sort")).toBe("descending");
  });

  it("renders charts, diagrams, stats and highlighted code without throwing", () => {
    const spec: RichSpec = {
      version: 1,
      nodes: [
        {
          type: "chart",
          kind: "line",
          categories: ["Jan", "Feb"],
          series: [
            { label: "Revenue", values: [10, 20] },
            { label: "Cost", values: [5, 8] },
          ],
        },
        {
          type: "diagram",
          steps: [
            { id: "a", label: "Start" },
            { id: "b", label: "End", connector: "next" },
          ],
        },
        { type: "stat", label: "Users", value: 12480, delta: 4.2 },
        { type: "progress", value: 65, label: "Done" },
        { type: "code", code: "const value = 1;", language: "ts" },
      ],
    };
    act(() => root.render(<RichResponse spec={spec} />));
    expect(host.textContent).toContain("Revenue");
    expect(host.textContent).toContain("Cost");
    expect(host.querySelectorAll(".ru-diagram-card")).toHaveLength(2);
    expect(
      host
        .querySelector(".ru-stat-value")
        ?.textContent?.replace(/\u00a0/g, " "),
    ).toBe("12 480");
    expect(
      host.querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow"),
    ).toBe("65");
    expect(host.querySelectorAll(".ru-tok-keyword").length).toBeGreaterThan(0);
  });

  it("keeps a non-http inline link as literal text", () => {
    const spec: RichSpec = {
      version: 1,
      nodes: [
        {
          type: "text",
          content:
            "See [x](javascript:alert(1)) and [site](https://example.org).",
        },
      ],
    };
    act(() => root.render(<RichResponse spec={spec} />));
    const links = host.querySelectorAll("a");
    expect(links).toHaveLength(1);
    expect(links[0]?.getAttribute("href")).toBe("https://example.org");
    expect(host.textContent).toContain("javascript:alert(1)");
  });
});

describe("table formats and filtering", () => {
  const spec: RichSpec = {
    version: 1,
    nodes: [
      {
        type: "table",
        filterable: true,
        sortable: true,
        columns: [
          { key: "task", label: "Task" },
          {
            key: "state",
            label: "State",
            format: "status",
            tones: { Done: "success", Blocked: "danger" },
          },
        ],
        rows: [
          { task: "Design", state: "Done" },
          { task: "Build", state: "Blocked" },
          { task: "Test", state: "Waiting" },
        ],
      },
    ],
  };

  it("renders semantic status pills and filters rows locally", () => {
    act(() => root.render(<RichResponse spec={spec} />));
    expect(host.querySelectorAll(".ru-status-pill")).toHaveLength(3);
    expect(
      host.querySelector('.ru-status-pill[data-tone="success"]')?.textContent,
    ).toBe("Done");
    const input = host.querySelector<HTMLInputElement>(
      'input[aria-label="Фильтр по таблице"]',
    )!;
    act(() => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!.call(input, "Build");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(host.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(host.querySelector("tbody tr td")?.textContent).toBe("Build");
    expect(host.querySelector('[role="status"]')?.textContent).toContain(
      "1 из 3",
    );
  });

  it("shows a no-results row instead of an empty table", () => {
    act(() => root.render(<RichResponse spec={spec} />));
    const input = host.querySelector<HTMLInputElement>(
      'input[aria-label="Фильтр по таблице"]',
    )!;
    act(() => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!.call(input, "nothing");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(host.querySelector(".ru-table-none")?.textContent).toBe(
      "Ничего не найдено",
    );
  });
});
