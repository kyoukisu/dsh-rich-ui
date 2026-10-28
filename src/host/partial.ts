/**
 * Streaming prefix reader for the rich-ui fence.
 *
 * It never repairs malformed JSON: it only reports the part of the document
 * that is already complete. A partially written string, an unfinished node or
 * an unresolved entity reference simply stops the prefix, so the reader can
 * show finished components while the model is still writing.
 */
import { parseRichSpec, type RichNode, type RichSpec } from "../core/schema.ts";

interface Scan {
  version?: unknown;
  entities?: unknown;
  nodes?: unknown[];
  /** True when the whole root object closed, so nothing is left to stream. */
  complete: boolean;
}

/** Walk a JSON value starting at `start`, returning the end index or -1. */
function valueEnd(raw: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") {
      depth--;
      if (depth === 0) return i + 1;
    } else if (ch === "," && depth === 0) return i;
  }
  return -1;
}

function skipSpace(raw: string, index: number): number {
  while (index < raw.length && /\s/.test(raw[index]!)) index++;
  return index;
}

/** Read the string literal starting at `start` (which must be `"`). */
function stringEnd(raw: string, start: number): number {
  let escaped = false;
  for (let i = start + 1; i < raw.length; i++) {
    const ch = raw[i];
    if (escaped) escaped = false;
    else if (ch === "\\") escaped = true;
    else if (ch === '"') return i + 1;
  }
  return -1;
}

function tryJson(raw: string, from: number, to: number): unknown {
  try {
    return JSON.parse(raw.slice(from, to));
  } catch {
    return undefined;
  }
}

/** Elements of an array that are already closed; the trailing one is dropped. */
function completeElements(raw: string, open: number): { items: unknown[]; complete: boolean } {
  const items: unknown[] = [];
  let index = skipSpace(raw, open + 1);
  for (;;) {
    if (index >= raw.length) return { items, complete: false };
    const end = valueEnd(raw, index);
    if (end === -1) return { items, complete: false };
    const value = tryJson(raw, index, end);
    if (value === undefined) return { items, complete: false };
    items.push(value);
    index = skipSpace(raw, end);
    if (raw[index] === ",") {
      index = skipSpace(raw, index + 1);
      continue;
    }
    if (raw[index] === "]") return { items, complete: true };
    return { items, complete: false };
  }
}

/** Read the root object up to the first byte that is not a complete member. */
export function scanPrefix(raw: string): Scan {
  const text = raw.trimStart();
  if (text[0] !== "{") return { complete: false };
  const result: Scan = { complete: false };
  let index = skipSpace(text, 1);
  for (;;) {
    if (text[index] !== '"') return result;
    const keyEnd = stringEnd(text, index);
    if (keyEnd === -1) return result;
    const key = tryJson(text, index, keyEnd);
    if (typeof key !== "string") return result;
    index = skipSpace(text, keyEnd);
    if (text[index] !== ":") return result;
    index = skipSpace(text, index + 1);
    if (key === "nodes" && text[index] === "[") {
      const { items, complete } = completeElements(text, index);
      result.nodes = items;
      if (!complete) return result;
      // An array closed but the root may continue (e.g. entities after nodes).
      const after = skipSpace(text, valueEnd(text, index) === -1 ? text.length : valueEnd(text, index));
      if (after >= text.length) return result;
      index = after;
    } else if (key === "entities" && text[index] === "[") {
      const { items, complete } = completeElements(text, index);
      if (!complete) return result;
      result.entities = items;
      index = skipSpace(text, index + (valueEnd(text, index)! - index));
    } else {
      const end = valueEnd(text, index);
      if (end === -1) return result;
      const value = tryJson(text, index, end);
      if (value === undefined) return result;
      if (key === "version") result.version = value;
      index = skipSpace(text, end);
    }
    if (text[index] === ",") {
      index = skipSpace(text, index + 1);
      continue;
    }
    if (text[index] === "}") {
      result.complete = true;
      return result;
    }
    return result;
  }
}

/**
 * Build a renderable spec from the completed prefix. Nodes are accepted only in
 * order; a node that fails validation or points at an unknown entity stops the
 * prefix instead of being skipped, so what the reader sees matches the document.
 */
export function parseStreamingSpec(raw: string): RichSpec | null {
  const scan = scanPrefix(raw);
  if (scan.version !== 1 || !Array.isArray(scan.nodes) || scan.nodes.length === 0) return null;
  const entities = Array.isArray(scan.entities) ? scan.entities : [];
  const kept: RichNode[] = [];
  for (const node of scan.nodes) {
    const candidate = { version: 1, entities, nodes: [...kept, node] };
    try {
      parseRichSpec(candidate);
    } catch {
      break;
    }
    kept.push(node as RichNode);
  }
  if (kept.length === 0) return null;
  const spec = { version: 1, entities, nodes: kept } as RichSpec;
  try {
    return parseRichSpec(spec);
  } catch {
    return null;
  }
}
