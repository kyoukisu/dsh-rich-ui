import { describe, expect, it } from "vitest";
import { parseStreamingSpec, scanPrefix } from "./partial.ts";

const doc = {
  version: 1,
  title: "Поток",
  entities: [
    { id: "a", kind: "Фильм", title: "A", image: "https://example.org/a.jpg" },
  ],
  nodes: [
    { type: "text", content: "Первый абзац" },
    { type: "entity-list", entityIds: ["a"] },
    { type: "callout", tone: "info", content: "Готово" },
  ],
};
const full = JSON.stringify(doc);

describe("streaming prefix", () => {
  it("reads every completed node even when the document is cut", () => {
    const cut = full.slice(0, full.indexOf('"callout"') + 20);
    const spec = parseStreamingSpec(cut);
    expect(spec?.nodes).toHaveLength(2);
    expect(scanPrefix(cut).complete).toBe(false);
  });
  it("drops a node whose string is still being written", () => {
    const cut = full.slice(0, full.indexOf("Первый") + 6);
    expect(parseStreamingSpec(cut)).toBeNull();
    const after = full.slice(0, full.indexOf("Первый") + 20);
    expect(parseStreamingSpec(after)?.nodes).toHaveLength(1);
  });
  it("stops at a node that does not validate instead of skipping it", () => {
    const broken = JSON.stringify({
      version: 1,
      nodes: [
        { type: "text", content: "ok" },
        { type: "text", content: "bad", unknown: true },
        { type: "text", content: "later" },
      ],
    });
    expect(parseStreamingSpec(broken)?.nodes).toEqual([
      { type: "text", content: "ok" },
    ]);
  });
  it("withholds entities that follow the nodes until their array closes", () => {
    const ordered = JSON.stringify({
      version: 1,
      nodes: [{ type: "text", content: "Первый абзац" }],
      entities: [{ id: "a", kind: "Фильм", title: "A" }],
    });
    const cut = ordered.slice(0, ordered.indexOf('"kind"') + 6);
    const spec = parseStreamingSpec(cut);
    expect(spec?.nodes).toHaveLength(1);
    expect(spec?.entities).toEqual([]);
  });
  it("rejects a document without a finished version field", () => {
    expect(parseStreamingSpec('{"vers')).toBeNull();
    expect(parseStreamingSpec("")).toBeNull();
  });
});
