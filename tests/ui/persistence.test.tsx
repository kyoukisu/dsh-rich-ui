// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { RichResponse } from "../../src/ui/RichResponse";
import { parseRichSpec, type RichSpec } from "../../src/core/schema";
import {
  contentFingerprint,
  persistenceStorageKey,
  loadPersistedState,
  savePersistedState,
} from "../../src/ui/persistence";
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement, root: Root;
const makeSpec = (): RichSpec =>
  parseRichSpec({
    version: 1,
    title: "Controls",
    nodes: [
      {
        type: "slider",
        stateKey: "amount",
        label: "Amount",
        min: 0,
        max: 10,
        step: 2,
      },
      { type: "switch", stateKey: "enabled", label: "Enabled" },
      { type: "input", stateKey: "private", label: "Private" },
      {
        type: "select",
        stateKey: "choice",
        options: [
          { label: "A", value: "a" },
          { label: "B", value: "b" },
        ],
      },
      { type: "button", label: "Reset", action: { type: "reset" } },
    ],
  });
beforeEach(() => {
  sessionStorage.clear();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});
const mount = (spec: RichSpec, key?: string) =>
  act(() => root.render(<RichResponse spec={spec} persistenceKey={key} />));
const range = () => host.querySelector<HTMLInputElement>('[type="range"]')!;
function change(value: string) {
  act(() => {
    const el = range();
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
}
function remount(spec: RichSpec, key?: string) {
  act(() => root.unmount());
  root = createRoot(host);
  mount(spec, key);
}
describe("opt-in tab-local persistence", () => {
  it("does not touch storage without an explicit key", () => {
    mount(makeSpec());
    change("6");
    expect(range().value).toBe("6");
    expect(sessionStorage.length).toBe(0);
  });
  it("restores controls after remount and isolates host identities", () => {
    const spec = makeSpec();
    mount(spec, "session:a:block:1");
    change("6");
    remount(spec, "session:a:block:1");
    expect(range().value).toBe("6");
    mount(spec, "session:b:block:1");
    expect(range().value).toBe("0");
  });
  it("canonicalizes object order and resets on content edits", () => {
    const spec = makeSpec();
    expect(contentFingerprint(spec)).toBe(
      contentFingerprint({ nodes: spec.nodes, title: spec.title, version: 1 }),
    );
    mount(spec, "one");
    change("8");
    mount({ ...spec, title: "Changed" }, "one");
    expect(range().value).toBe("0");
  });
  it("reset removes the record instead of persisting defaults", () => {
    const spec = makeSpec();
    mount(spec, "one");
    change("4");
    expect(sessionStorage.length).toBe(1);
    act(() => host.querySelector("button")!.click());
    expect(range().value).toBe("0");
    expect(sessionStorage.length).toBe(0);
    remount(spec, "one");
    expect(range().value).toBe("0");
  });
  it("persists only declared non-input controls, excluding aliased input keys", () => {
    const spec = makeSpec();
    savePersistedState(spec, "one", {
      amount: 4,
      enabled: true,
      private: "sensitive",
      choice: "b",
      unbound: "secret",
    });
    const record = JSON.parse(
      sessionStorage.getItem(persistenceStorageKey("one"))!,
    );
    expect(record.state).toEqual({ amount: 4, enabled: true, choice: "b" });
    const aliased: RichSpec = {
      ...spec,
      nodes: [...spec.nodes, { type: "input", stateKey: "amount" }],
    };
    savePersistedState(aliased, "one", { amount: 4 });
    expect(
      JSON.parse(sessionStorage.getItem(persistenceStorageKey("one"))!).state,
    ).toEqual({});
  });
  it("validates loaded type, slider bounds and step, and enum membership", () => {
    const spec = makeSpec();
    for (const state of [
      { amount: 99, enabled: "yes", choice: "evil" },
      { amount: 3 },
      { amount: Infinity },
    ]) {
      sessionStorage.setItem(
        persistenceStorageKey("one"),
        JSON.stringify({
          version: 1,
          fingerprint: contentFingerprint(spec),
          state,
        }),
      );
      expect(loadPersistedState(spec, "one")).toMatchObject({
        amount: 0,
        enabled: false,
        choice: "a",
      });
    }
  });
  it("rejects malformed, oversized, versioned and pollution records safely", () => {
    const spec = makeSpec();
    const key = persistenceStorageKey("one");
    for (const raw of [
      "{",
      "x".repeat(40000),
      JSON.stringify({
        version: 2,
        state: { amount: 4 },
        fingerprint: contentFingerprint(spec),
      }),
      `{"version":1,"fingerprint":"${contentFingerprint(spec)}","state":{"__proto__":1,"amount":4}}`,
    ]) {
      sessionStorage.setItem(key, raw);
      expect(loadPersistedState(spec, "one").amount).toBe(0);
    }
  });
  it("degrades gracefully if storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => {
      mount(makeSpec(), "one");
      change("6");
    }).not.toThrow();
    expect(range().value).toBe("6");
  });
});

describe("control persistence coverage", () => {
  it("restores checkbox, radio and mixed-type select values", () => {
    const spec = parseRichSpec({
      version: 1,
      nodes: [
        { type: "checkbox", stateKey: "checked", label: "Checked" },
        {
          type: "radio",
          stateKey: "plan",
          options: [
            { label: "One", value: 1 },
            { label: "Two", value: 2 },
          ],
        },
        {
          type: "select",
          stateKey: "choice",
          options: [
            { label: "Text", value: "a" },
            { label: "Number", value: 2 },
          ],
        },
      ],
    });
    savePersistedState(spec, "controls", {
      checked: true,
      plan: 2,
      choice: 2,
    });
    expect(loadPersistedState(spec, "controls")).toMatchObject({
      checked: true,
      plan: 2,
      choice: 2,
    });
  });
});
