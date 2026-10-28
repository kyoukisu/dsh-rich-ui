import { describe, expect, it } from "vitest";
import { LIMITS, parseRichSpec, validateExpr } from "../../src/core/schema";
import { getInitialState } from "../../src/core/evaluator";
const spec = (node: unknown) => ({ version: 1, nodes: [node] });
describe("safe schema", () => {
  it("accepts typed primitives and initializes controls inside popovers", () => {
    const parsed = parseRichSpec({
      version: 1,
      nodes: [
        {
          type: "popover",
          label: "Settings",
          children: [{ type: "switch", stateKey: "enabled" }],
        },
        { type: "tooltip", label: "Help", text: "Plain text only" },
        {
          type: "image-group",
          src: ["https://example.org/a.jpg"],
          alt: "Gallery",
          label: "Photos",
        },
      ],
    });
    expect(parsed.nodes).toHaveLength(3);
    expect(getInitialState(parsed).enabled).toBe(false);
  });
  it("strictly rejects unsafe primitive fields, URLs and undeclared tooltip children", () => {
    for (const node of [
      { type: "tooltip", label: "Help", text: "Tip", children: [] },
      { type: "popover", label: "Settings", children: [], onOpen: "eval()" },
      { type: "image-group", src: ["data:image/png;base64,abc"], alt: "X" },
      {
        type: "image-group",
        src: ["https://example.org/a.jpg", "javascript:alert(1)"],
        alt: "X",
      },
      { type: "image-group", src: "https://example.org/a.jpg", alt: "X" },
    ])
      expect(() => parseRichSpec(spec(node))).toThrow();
  });
  it("counts nested popover children toward document and node budgets", () => {
    let node: unknown = { type: "tooltip", label: "Help", text: "Tip" };
    for (let i = 0; i < 60; i++)
      node = { type: "popover", label: "More", children: [node] };
    expect(() => parseRichSpec(spec(node))).toThrow(/budget/);
    expect(() =>
      parseRichSpec(
        spec({
          type: "popover",
          label: "More",
          children: Array.from({ length: 1000 }, () => ({ type: "divider" })),
        }),
      ),
    ).toThrow(/budget/);
  });
  it("parses the declarative contract into detached null-prototype records", () => {
    const input = { version: 1, nodes: [{ type: "text", content: "hello" }] };
    const result = parseRichSpec(input);
    expect(result.nodes[0]).toEqual(input.nodes[0]);
    expect(result).not.toBe(input);
    expect(Object.getPrototypeOf(result)).toBe(null);
  });
  it.each(["script", "iframe", "html"])("rejects unknown node %s", (type) =>
    expect(() => parseRichSpec(spec({ type }))).toThrow(),
  );
  it("rejects arbitrary properties, scripts, styles and action types", () => {
    for (const node of [
      { type: "text", content: "x", onClick: "alert(1)" },
      { type: "text", content: "x", style: {} },
      {
        type: "button",
        label: "x",
        action: { type: "eval", code: "alert(1)" },
      },
    ])
      expect(() => parseRichSpec(spec(node))).toThrow();
  });
  it.each([
    "javascript:alert(1)",
    "data:image/svg+xml,x",
    "file:///etc/passwd",
    "//example.org/x",
    "https://a:b@example.org",
    "https://example.org/\nx",
  ])("blocks URL %s", (src) => {
    expect(() =>
      parseRichSpec(spec({ type: "image", src, alt: "x" })),
    ).toThrow();
    expect(() =>
      parseRichSpec(
        spec({
          type: "button",
          label: "x",
          action: { type: "open-url", url: src },
        }),
      ),
    ).toThrow();
  });
  it("accepts safe URL and validates entity references", () => {
    expect(() =>
      parseRichSpec({
        version: 1,
        nodes: [{ type: "entity-ref", entityId: "x" }],
        entities: [
          {
            id: "x",
            kind: "product",
            title: "X",
            image: "https://example.org/a.png",
            sources: [{ title: "source", url: "http://example.org" }],
          },
        ],
      }),
    ).not.toThrow();
    expect(() =>
      parseRichSpec(spec({ type: "entity-ref", entityId: "missing" })),
    ).toThrow(/Unknown entity/);
  });
  it("rejects duplicate entities, node IDs, tabs and columns", () => {
    expect(() =>
      parseRichSpec({
        version: 1,
        nodes: [
          { type: "divider", id: "a" },
          { type: "divider", id: "a" },
        ],
      }),
    ).toThrow(/Duplicate/);
    expect(() =>
      parseRichSpec(
        spec({
          type: "tabs",
          stateKey: "tab",
          tabs: [
            { id: "x", label: "x", children: [] },
            { id: "x", label: "y", children: [] },
          ],
        }),
      ),
    ).toThrow(/Duplicate/);
    expect(() =>
      parseRichSpec(
        spec({
          type: "table",
          columns: [
            { key: "a", label: "a" },
            { key: "a", label: "b" },
          ],
          rows: [],
        }),
      ),
    ).toThrow(/Duplicate/);
  });
  it("rejects pollution, secrets and property paths", () => {
    for (const key of [
      "__proto__",
      "constructor",
      "prototype",
      "password",
      "api_key",
      "token",
      "a.b",
    ]) {
      expect(() =>
        parseRichSpec({
          version: 1,
          nodes: [],
          initialState: JSON.parse(`{"${key}":1}`),
        }),
      ).toThrow();
      expect(() =>
        parseRichSpec(spec({ type: "input", stateKey: key })),
      ).toThrow();
    }
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
  it("never invokes getters", () => {
    let calls = 0;
    const hostile = {
      get version() {
        calls++;
        return 1;
      },
      nodes: [],
    };
    expect(() => parseRichSpec(hostile)).toThrow(/Accessors/);
    expect(calls).toBe(0);
    expect(() =>
      validateExpr({
        get op() {
          calls++;
          return "add";
        },
        args: [1, 2],
      }),
    ).toThrow();
    expect(calls).toBe(0);
  });
  it("rejects cycles, functions, exotic prototypes, sparse arrays and hidden fields", () => {
    const x: Record<string, unknown> = {};
    x.x = x;
    for (const input of [
      x,
      new Date(),
      () => 1,
      { version: 1, nodes: new Array(3) },
      Object.defineProperty({ version: 1, nodes: [] }, "hidden", { value: 1 }),
    ])
      expect(() => parseRichSpec(input)).toThrow();
  });
  it("enforces recursive and node budgets", () => {
    let node: unknown = { type: "text", content: "x" };
    for (let i = 0; i < 60; i++) node = { type: "stack", children: [node] };
    expect(() => parseRichSpec(spec(node))).toThrow(/budget/);
    expect(() =>
      parseRichSpec({
        version: 1,
        nodes: Array.from({ length: LIMITS.nodes }, () => ({
          type: "stack",
          children: [{ type: "divider" }],
        })),
      }),
    ).toThrow(/budget/);
  });
  it("validates numeric bounds and slider constraints", () => {
    for (const value of [NaN, Infinity, 1e20])
      expect(() =>
        parseRichSpec({ version: 1, nodes: [], initialState: { x: value } }),
      ).toThrow();
    for (const extra of [
      { min: 2, max: 1 },
      { min: 0, max: 1, step: 0 },
    ])
      expect(() =>
        parseRichSpec(spec({ type: "slider", stateKey: "x", ...extra })),
      ).toThrow();
  });
  it("checks expression operations, arity and depth", () => {
    for (const expr of [
      { op: "eval", args: ["x"] },
      { op: "add", args: [1] },
      { state: "constructor" },
      { op: "add", args: [1, 2], path: "a" },
    ])
      expect(() => parseRichSpec(spec({ type: "computed", expr }))).toThrow();
    let expr: unknown = 1;
    for (let i = 0; i < 30; i++) expr = { op: "abs", args: [expr] };
    expect(() => validateExpr(expr)).toThrow(/budget/);
  });
});
