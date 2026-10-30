import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseRichSpec, type RichSpec } from "../core/schema";

export const name = "@kyoukisu/dsh-rich-ui";
export const inject = ["systemPrompt", "tools"];

interface HostContext {
  systemPrompt: {
    getSectionOrder(name: string): number;
    section(section: { name: string; order: number; text: string }): unknown;
  };
  tools: {
    register(definition: ValidateTool): () => void;
  };
}

/**
 * Structural shape of one DSH tool definition. The host package deliberately
 * does not import `@deepseek-ai/dsh-tools`: a plugin must keep its own runtime
 * dependencies, and the registry accepts the documented JSON Schema fields.
 */
export interface ValidateTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  output: {
    schema: Record<string, unknown>;
    render: (
      args: unknown,
      value: unknown,
    ) => Array<{ type: "text"; text: string }>;
  };
  execute(
    args: unknown,
    exec: { signal?: AbortSignal },
  ): Promise<Record<string, unknown>>;
}

const MAX_DOCUMENT = 256_000;

function parseDocument(document: string): RichSpec {
  if (document.length > MAX_DOCUMENT)
    throw new Error(
      `Document is longer than ${MAX_DOCUMENT} characters; split the answer or shorten the text.`,
    );
  const value: unknown = JSON.parse(document, (key, item: unknown) => {
    if (key === "__proto__" || key === "constructor" || key === "prototype")
      throw new Error("Unsafe JSON key");
    return item;
  });
  return parseRichSpec(value);
}

/**
 * Real validation channel for the model. The browser sees only rendered DOM,
 * so it cannot call a tool or edit the conversation. This host-side tool closes
 * that gap the right way: the model validates the exact document before it
 * emits the fence, and a rejection is a tool result rather than a visible user
 * message.
 */
export function buildValidateTool(): ValidateTool {
  return {
    name: "rich_ui_validate",
    description:
      "Validate a complete rich-ui v1 JSON document before sending it as a ```rich-ui fence. Pass the exact JSON object as a string in document, without the fence markers. Returns {valid:true,title?,nodes,entities} or {valid:false,error}. Fix the reported field and validate again. This is a tool call, not a chat message: it does not ask the user, does not edit the answer, and leaves no repair prompt in the conversation.",
    parameters: {
      type: "object",
      properties: {
        document: {
          type: "string",
          description:
            "Complete rich-ui JSON document, version 1, as a string. Maximum 256000 characters.",
        },
      },
      required: ["document"],
    },
    output: {
      schema: {
        type: "object",
        properties: {
          valid: { type: "boolean" },
          error: { type: "string" },
          title: { type: "string" },
          nodes: { type: "integer" },
          entities: { type: "integer" },
        },
        required: ["valid"],
      },
      render: (_args, value) => [{ type: "text", text: JSON.stringify(value) }],
    },
    async execute(args, exec) {
      exec.signal?.throwIfAborted();
      if (
        typeof args !== "object" ||
        args === null ||
        typeof (args as { document?: unknown }).document !== "string"
      )
        throw new Error("document must be a string");
      const document = (args as { document: string }).document;
      try {
        const spec = parseDocument(document);
        return {
          valid: true,
          ...(spec.title === undefined ? {} : { title: spec.title }),
          nodes: countNodes(spec),
          entities: spec.entities?.length ?? 0,
        };
      } catch (error) {
        return {
          valid: false,
          error:
            error instanceof Error
              ? error.message.slice(0, 1000)
              : String(error).slice(0, 1000),
        };
      }
    },
  };
}

function countNodes(spec: RichSpec): number {
  let count = 0;
  const visit = (nodes: RichSpec["nodes"]) => {
    for (const node of nodes) {
      count += 1;
      if (node.type === "conditional") {
        visit(node.children);
        if (node.elseChildren) visit(node.elseChildren);
      } else if ("children" in node) {
        visit(node.children as RichSpec["nodes"]);
      }
      if (node.type === "tabs")
        for (const tab of node.tabs) visit(tab.children);
    }
  };
  visit(spec.nodes);
  return count;
}

const SKILL_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  // Source src/host and emitted lib/host share the same two-level package root.
  "../../prompt-rich-ui",
);
const PROMPT_PATH = resolve(SKILL_DIR, "prompt.md");

/**
 * The contract is part of the system prompt, not a lazily loaded skill: rich-ui
 * is a frequent output shape, and a skill lookup per answer costs more than the
 * text. Reference files stay on disk and are opened only when a block was
 * rejected or an unfamiliar node is needed; their absolute paths are part of
 * the prompt so the model never has to guess where they are.
 */
export function buildSection(hasTool = true): string {
  const body = readFileSync(PROMPT_PATH, "utf8").trim();
  return [
    "Use a fenced rich-ui block when entity exploration, comparisons or local interaction meaningfully improve the answer; keep simple answers as prose. This language is NOT dsh-ui.",
    body,
    `Reference files, opened only if a block was rejected or you need an unfamiliar node: ${SKILL_DIR}/references/schema.md and ${SKILL_DIR}/references/examples.md. Do not read them pre-emptively.`,
    hasTool
      ? "The host registers the `rich_ui_validate` tool. Call it once with the exact document before emitting each rich-ui block, fix any reported error, and send the validated document. The tool returns a schema error as a tool result; no user-visible repair message exists."
      : "No `rich_ui_validate` tool is registered on this host. Do not call it; check the document against the reference files and send only a complete valid block.",
  ].join("\n\n");
}

export function apply(ctx: HostContext): (() => void) | undefined {
  // Register first: the prompt must not promise a tool that this host refused.
  let disposeTool: (() => void) | undefined;
  let hasTool = false;
  try {
    disposeTool = ctx.tools.register(buildValidateTool());
    hasTool = true;
  } catch (error) {
    console.warn("[rich-ui] validation tool unavailable", error);
  }
  try {
    ctx.systemPrompt.section({
      name: "rich-ui:fence",
      order: ctx.systemPrompt.getSectionOrder("STRUCTURED_OUTPUT"),
      text: buildSection(hasTool),
    });
  } catch (error) {
    disposeTool?.();
    throw error;
  }
  return disposeTool;
}
