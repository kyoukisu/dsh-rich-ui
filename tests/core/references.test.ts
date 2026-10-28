import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseRichSpec } from "../../src/core/schema";

/** The prompt references are executable fixtures: every example must parse. */
describe("prompt reference documents", () => {
  const dir = resolve(process.cwd(), "prompt-rich-ui/references");
  const examples = readFileSync(resolve(dir, "examples.md"), "utf8");
  const schema = readFileSync(resolve(dir, "schema.md"), "utf8");
  const blocks = [...examples.matchAll(/```json\n([\s\S]*?)```/g)].map(
    (match) => match[1]!,
  );

  it("contains parseable complete documents", () => {
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks)
      expect(() => parseRichSpec(JSON.parse(block))).not.toThrow();
  });

  it("documents every node type the parser accepts", () => {
    for (const type of [
      "stat",
      "progress",
      "status",
      "diagram",
      "table",
      "chart",
      "code",
      "entity-list",
      "callout",
    ])
      expect(schema).toContain(`\`${type}\``);
  });
});
