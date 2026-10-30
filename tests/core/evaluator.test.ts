import { describe, expect, it } from "vitest";
import { evaluate, getInitialState } from "../../src/core/evaluator";
import { type Expr, parseRichSpec } from "../../src/core/schema";
describe("reactive evaluator", () => {
  it("recomputes a pure expression against new state", () => {
    const expr: Expr = {
      op: "mul",
      args: [{ state: "quantity" }, { state: "price" }],
    };
    expect(evaluate(expr, { quantity: 2, price: 7 })).toBe(14);
    expect(evaluate(expr, { quantity: 3, price: 7 })).toBe(21);
  });
  it.each<[Expr, unknown]>([
    [{ op: "add", args: [1, 2, 3] }, 6],
    [{ op: "sub", args: [5, 3] }, 2],
    [{ op: "div", args: [9, 2] }, 4.5],
    [{ op: "mod", args: [9, 2] }, 1],
    [{ op: "pow", args: [2, 8] }, 256],
    [{ op: "round", args: [1.234, 2] }, 1.23],
    [{ op: "floor", args: [1.9] }, 1],
    [{ op: "ceil", args: [1.1] }, 2],
    [{ op: "min", args: [4, 2] }, 2],
    [{ op: "max", args: [4, 2] }, 4],
    [{ op: "abs", args: [-2] }, 2],
    [{ op: "eq", args: [1, "1"] }, false],
    [{ op: "ne", args: [1, "1"] }, true],
    [{ op: "gt", args: [2, 1] }, true],
    [{ op: "gte", args: [2, 2] }, true],
    [{ op: "lt", args: [1, 2] }, true],
    [{ op: "lte", args: [2, 2] }, true],
    [{ op: "not", args: [false] }, true],
    [{ op: "concat", args: ["hello ", 2, null] }, "hello 2"],
    [{ op: "format", args: ["{0}: {1}", "Price", 42] }, "Price: 42"],
  ])("evaluates %j", (expr, value) => expect(evaluate(expr)).toBe(value));
  it("short circuits boolean expressions", () => {
    expect(
      evaluate({ op: "and", args: [false, { op: "div", args: [1, 0] }] }),
    ).toBe(false);
    expect(
      evaluate({ op: "or", args: [true, { op: "div", args: [1, 0] }] }),
    ).toBe(true);
  });
  it("rejects invalid arithmetic and computed DOS", () => {
    const bad: Expr[] = [
      { op: "div", args: [1, 0] },
      { op: "mod", args: [1, 0] },
      { op: "pow", args: [2, 1000] },
      { op: "pow", args: [-1, 0.5] },
      { op: "mul", args: [1e12, 1e12] },
      { op: "round", args: [1, -1] },
      { op: "add", args: ["1", 2] },
      { op: "concat", args: ["x".repeat(10000), "y".repeat(10000)] },
      { op: "format", args: ["{0}".repeat(1000), "x".repeat(1000)] },
    ];
    for (const expr of bad) expect(() => evaluate(expr)).toThrow();
  });
  it("does not read prototype values or execute state getters", () => {
    expect(evaluate({ state: "x" }, Object.create({ x: 5 }))).toBe(null);
    let called = false;
    const state = Object.defineProperty({}, "x", {
      get() {
        called = true;
        return 1;
      },
    });
    expect(() => evaluate({ state: "x" }, state)).toThrow(/accessors/);
    expect(called).toBe(false);
    expect(() => evaluate({ state: "x" }, { x: Infinity })).toThrow();
  });
  it("validates expressions even outside parsed specs", () => {
    expect(() =>
      evaluate({ op: "constructor", args: [] } as unknown as Expr),
    ).toThrow();
    const expr: Record<string, unknown> = { op: "abs" };
    expr.args = [expr];
    expect(() => evaluate(expr as unknown as Expr)).toThrow();
  });
  it("initializes controls across all branches without mutating explicit values", () => {
    const spec = parseRichSpec({
      version: 1,
      initialState: { amount: 5 },
      nodes: [
        { type: "slider", stateKey: "amount", min: 0, max: 10 },
        { type: "switch", stateKey: "enabled" },
        { type: "input", stateKey: "name" },
        { type: "input", stateKey: "count", inputType: "number" },
        {
          type: "select",
          stateKey: "choice",
          options: [{ label: "A", value: "a" }],
        },
        {
          type: "tabs",
          stateKey: "tab",
          tabs: [{ id: "first", label: "First", children: [] }],
        },
        {
          type: "conditional",
          when: false,
          children: [],
          elseChildren: [{ type: "switch", stateKey: "hidden" }],
        },
      ],
    });
    const state = getInitialState(spec);
    expect(state).toEqual({
      amount: 5,
      enabled: false,
      name: "",
      count: 0,
      choice: "a",
      tab: "first",
      hidden: false,
    });
    expect(Object.getPrototypeOf(state)).toBe(null);
    state.amount = 9;
    expect(spec.initialState?.amount).toBe(5);
  });
});

describe("control defaults", () => {
  it("initializes checkbox, radio and segmented controls", () => {
    const parsed = parseRichSpec({
      version: 1,
      nodes: [
        { type: "checkbox", stateKey: "agree", label: "Agree" },
        {
          type: "radio",
          stateKey: "plan",
          options: [
            { label: "Free", value: "free" },
            { label: "Pro", value: "pro" },
          ],
        },
        {
          type: "segmented",
          stateKey: "mode",
          options: [
            { label: "Day", value: 1 },
            { label: "Night", value: 2 },
          ],
        },
      ],
    });
    expect(getInitialState(parsed)).toEqual({
      agree: false,
      plan: "free",
      mode: 1,
    });
  });
});
