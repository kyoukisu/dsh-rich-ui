import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const name = "@kyoukisu/dsh-rich-ui";
export const inject = ["systemPrompt"];

interface HostContext {
  systemPrompt: {
    getSectionOrder(name: string): number;
    section(section: { name: string; order: number; text: string }): unknown;
  };
}

const SKILL_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  // Source src/host and emitted lib/host share the same two-level package root.
  "../../skills/rich-ui",
);
const PROMPT_PATH = resolve(SKILL_DIR, "prompt.md");

/**
 * The contract is part of the system prompt, not a lazily loaded skill: rich-ui
 * is a frequent output shape, and a skill lookup per answer costs more than the
 * text. Reference files stay on disk and are opened only when a block was
 * rejected or an unfamiliar node is needed; their absolute paths are part of
 * the prompt so the model never has to guess where they are.
 */
export function buildSection(): string {
  const body = readFileSync(PROMPT_PATH, "utf8").trim();
  return [
    "Use a fenced rich-ui block when entity exploration, comparisons or local interaction meaningfully improve the answer; keep simple answers as prose. This language is NOT dsh-ui.",
    body,
    `Reference files, opened only if a block was rejected or you need an unfamiliar node: ${SKILL_DIR}/references/schema.md and ${SKILL_DIR}/references/examples.md. Do not read them pre-emptively.`,
    "No rich-ui validation tool is installed. Emit a complete strict JSON block in the answer body; invalid blocks stay visible as code.",
  ].join("\n\n");
}

export function apply(ctx: HostContext): void {
  ctx.systemPrompt.section({
    name: "rich-ui:fence",
    order: ctx.systemPrompt.getSectionOrder("STRUCTURED_OUTPUT"),
    text: buildSection(),
  });
}
