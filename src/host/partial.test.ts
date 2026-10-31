import { describe, expect, it } from "vitest";
import { parseStreamingSpec, scanPrefix } from "./partial.ts";

const doc = {
  version: 1,
  title: "Stream",
  entities: [
    { id: "a", kind: "Film", title: "A", image: "https://example.org/a.jpg" },
  ],
  nodes: [
    { type: "text", content: "First paragraph" },
    { type: "entity-list", entityIds: ["a"] },
    { type: "callout", tone: "info", content: "Done" },
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
    const cut = full.slice(0, full.indexOf("First") + 6);
    expect(parseStreamingSpec(cut)).toBeNull();
    const after = full.slice(0, full.indexOf("First") + 20);
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
      nodes: [{ type: "text", content: "First paragraph" }],
      entities: [{ id: "a", kind: "Film", title: "A" }],
    });
    const cut = ordered.slice(0, ordered.indexOf('"kind"') + 6);
    const spec = parseStreamingSpec(cut);
    expect(spec?.nodes).toHaveLength(1);
    expect(spec?.entities).toEqual([]);
  });
  it("renders a complete document whose entity array is empty", () => {
    const empty = JSON.stringify({
      version: 1,
      entities: [],
      nodes: [{ type: "text", content: "No entities" }],
    });
    expect(parseStreamingSpec(empty)?.nodes).toHaveLength(1);
  });
  it("keeps title and initialState in the preview", () => {
    const document = JSON.stringify({
      version: 1,
      title: "Stateful",
      initialState: { n: 2 },
      entities: [],
      nodes: [{ type: "computed", expr: { state: "n" } }],
    });
    const spec = parseStreamingSpec(document);
    expect(spec?.title).toBe("Stateful");
    expect(spec?.initialState).toEqual({ n: 2 });
    expect(spec?.entities).toEqual([]);
  });
  it("withholds completed nodes while a later initialState is unfinished", () => {
    const prefix =
      '{"version":1,"nodes":[{"type":"text","content":"ok"}],"initialState":{"n":';
    expect(parseStreamingSpec(prefix)).toBeNull();
    expect(parseStreamingSpec(`${prefix}2}}`)?.initialState).toEqual({ n: 2 });
  });
  it("does not preview root members that the final validator rejects", () => {
    const unknown = JSON.stringify({
      version: 1,
      unexpected: true,
      nodes: [{ type: "text", content: "ok" }],
    });
    expect(parseStreamingSpec(unknown)).toBeNull();
  });
  it("rejects a document without a finished version field", () => {
    expect(parseStreamingSpec('{"vers')).toBeNull();
    expect(parseStreamingSpec("")).toBeNull();
  });
});
