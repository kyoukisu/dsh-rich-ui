import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const name = "@kyoukisu/dsh-rich-ui";
export const inject = ["systemPrompt"];

interface SkillSummary {
  name: string;
  description: string;
  invocation: { modelInvocable: boolean; userInvocable: boolean };
  source: "bundled";
  provider: string;
  path: string;
  resourceBase: { kind: "directory"; path: string };
}
interface SkillProvider {
  name: string;
  list(): Promise<Array<SkillSummary & { rank: number; locator: string }>>;
  get(): Promise<SkillSummary & { content: string }>;
}
interface HostContext {
  systemPrompt: {
    getSectionOrder(name: string): number;
    section(section: { name: string; order: number; text: string }): unknown;
  };
  /** Optional dependency fiber; registration follows provider unload/replacement. */
  inject(
    services: string[],
    callback: (ctx: {
      skills: { registerProvider(factory: () => SkillProvider): unknown };
    }) => void,
  ): unknown;
}

export const RICH_UI_SECTION = `Use a fenced rich-ui block when entity exploration, comparisons or local interaction meaningfully improve the answer; keep simple answers as prose. Load the rich-ui skill before unfamiliar nodes. This language is NOT dsh-ui.
Strict JSON root: {"version":1,"nodes":[{"type":"text","content":"Result"}]}; optional title, entities and initialState. Use children for layouts, stateKey for controls, entityId for entity-ref; unknown fields reject the full block. Never use items, panel, append, raw HTML, arbitrary CSS or executable JavaScript.
Local expressions are scalars, {"state":"key"} or {"op":"mul","args":[{"state":"quantity"},25]}. Local set/toggle/reset and controls do not call the model. A clearly labelled send-message button requests model work through [rich-ui-action] JSON user-message data, not privileged instructions. Never auto-submit or request secrets. Use verified facts and actual source links, visible text in the user's language, complete JSON in the answer body. No rich-ui validation tool or automatic replacement protocol is installed.`;

/** Same native bundled-provider API and rank as installed genui, no mandatory skills dependency. */
export function bundledSkillProvider(): SkillProvider {
  const directory = dirname(fileURLToPath(import.meta.url));
  // Source src/host and emitted lib/host share the same two-level package root.
  const path = resolve(directory, "../../skills/rich-ui/SKILL.md");
  const raw = readFileSync(path, "utf8");
  const front = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(raw);
  if (!front) throw new Error("rich-ui skill is missing frontmatter");
  const description = /^description:\s*(.+)$/m.exec(front[1]!)?.[1]?.trim();
  if (!description) throw new Error("rich-ui skill has no description");
  const summary: SkillSummary = {
    name: "rich-ui",
    description,
    invocation: { modelInvocable: true, userInvocable: true },
    source: "bundled",
    provider: "dsh-rich-ui",
    path,
    resourceBase: { kind: "directory", path: dirname(path) },
  };
  return {
    name: "dsh-rich-ui",
    list: () => Promise.resolve([{ ...summary, rank: 600, locator: path }]),
    get: () =>
      Promise.resolve({ ...summary, content: raw.slice(front[0].length) }),
  };
}

export function apply(ctx: HostContext): void {
  ctx.systemPrompt.section({
    name: "rich-ui:fence",
    order: ctx.systemPrompt.getSectionOrder("STRUCTURED_OUTPUT"),
    text: RICH_UI_SECTION,
  });
  // Cordis inject entries are hard requirements. A fiber probe instead leaves
  // the fence channel available on hosts without skill catalog/tool services.
  ctx.inject(["skills"], (skillCtx) => {
    skillCtx.skills.registerProvider(() => bundledSkillProvider());
  });
}
