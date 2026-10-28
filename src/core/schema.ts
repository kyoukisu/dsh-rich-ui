/** Safe JSON-only contract. No HTML, scripts, arbitrary styles or property paths. */
export type Scalar = string | number | boolean | null;
export type ExprOp =
  | "add"
  | "sub"
  | "mul"
  | "div"
  | "mod"
  | "pow"
  | "min"
  | "max"
  | "abs"
  | "round"
  | "floor"
  | "ceil"
  | "eq"
  | "ne"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "and"
  | "or"
  | "not"
  | "concat"
  | "format";
export type Expr = Scalar | { state: string } | { op: ExprOp; args: Expr[] };
export type RichAction =
  | { type: "set"; key: string; value: Expr }
  | { type: "toggle"; key: string }
  | { type: "reset" }
  | { type: "open-entity"; entityId: string }
  | { type: "close-entity" }
  | { type: "copy"; text: Expr }
  | { type: "open-url"; url: string }
  | { type: "send-message"; text: Expr };
export interface EntityBadge {
  label: string;
  tone?: "success" | "info" | "warning" | "danger" | "accent";
}
export interface Entity {
  id: string;
  kind: string;
  title: string;
  subtitle?: string;
  description?: string;
  image?: string;
  images?: string[];
  facts?: { label: string; value: Scalar }[];
  sources?: { title: string; url: string }[];
  related?: string[];
  /** Short highlight under the row, e.g. "Самый доступный". */
  badge?: EntityBadge;
}
export interface NodeBase {
  id?: string;
}
export interface TextNode extends NodeBase {
  type: "text";
  content: Expr;
  variant?: "body" | "title" | "subtitle" | "caption";
}
export interface ContainerNode extends NodeBase {
  type: "stack" | "row" | "grid" | "card";
  children: RichNode[];
  gap?: number;
  columns?: number;
  title?: string;
}
export interface IconNode extends NodeBase {
  type: "icon";
  name: string;
  size?: number;
  /** Semantic colour only; arbitrary values are rejected so themes stay legible. */
  tone?:
    "default" | "muted" | "success" | "warning" | "danger" | "info" | "accent";
}
export interface MetaItem {
  text: string;
  icon?: string;
}
/** Compact inline summary strip: "4 модели · От 1 382 ₽ · Доставка 7–18 ноября". */
export interface MetaNode extends NodeBase {
  type: "meta";
  items: MetaItem[];
}
export interface EntityListNode extends NodeBase {
  type: "entity-list";
  /** Ordered references to declared entities; rendered as full-width rows. */
  entityIds: string[];
}
export interface ImageNode extends NodeBase {
  type: "image";
  src: string;
  alt: string;
  caption?: string;
}
export interface PopoverNode extends NodeBase {
  type: "popover";
  label: string;
  children: RichNode[];
}
export interface TooltipNode extends NodeBase {
  type: "tooltip";
  label: string;
  text: string;
}
export interface ImageGroupNode extends NodeBase {
  type: "image-group";
  src: string[];
  alt: string;
  label?: string;
}
export interface CarouselNode extends NodeBase {
  type: "carousel";
  children: RichNode[];
}
export interface EntityRefNode extends NodeBase {
  type: "entity-ref";
  entityId: string;
}
export interface ButtonNode extends NodeBase {
  type: "button";
  label: string;
  action: RichAction;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: Expr;
}
export interface InputNode extends NodeBase {
  type: "input";
  stateKey: string;
  label?: string;
  placeholder?: string;
  inputType?: "text" | "number" | "date";
}
export interface SelectNode extends NodeBase {
  type: "select";
  stateKey: string;
  label?: string;
  options: { label: string; value: Scalar }[];
}
export interface CheckboxNode extends NodeBase {
  type: "checkbox";
  stateKey: string;
  label: string;
}
export interface RadioNode extends NodeBase {
  type: "radio" | "segmented";
  stateKey: string;
  label?: string;
  options: { label: string; value: Scalar }[];
}
export interface SliderNode extends NodeBase {
  type: "slider";
  stateKey: string;
  label?: string;
  min: number;
  max: number;
  step?: number;
}
export interface SwitchNode extends NodeBase {
  type: "switch";
  stateKey: string;
  label?: string;
}
export interface ComputedNode extends NodeBase {
  type: "computed";
  expr: Expr;
  label?: string;
}
export interface ConditionalNode extends NodeBase {
  type: "conditional";
  when: Expr;
  children: RichNode[];
  elseChildren?: RichNode[];
}
export interface TabsNode extends NodeBase {
  type: "tabs";
  stateKey: string;
  tabs: { id: string; label: string; children: RichNode[] }[];
}
export interface TableNode extends NodeBase {
  type: "table";
  columns: { key: string; label: string }[];
  rows: Record<string, Expr>[];
}
export interface ChartNode extends NodeBase {
  type: "chart";
  kind: "bar" | "line" | "donut";
  data: { label: string; value: Expr }[];
}
export interface CalloutNode extends NodeBase {
  type: "callout";
  content: Expr;
  tone?: "info" | "success" | "warning" | "error";
  /** Optional one-line heading, rendered bold above the content. */
  title?: string;
}
export interface DividerNode extends NodeBase {
  type: "divider";
  label?: string;
}
export interface CodeNode extends NodeBase {
  type: "code";
  code: string;
  language?: string;
}
export type RichNode =
  | CheckboxNode
  | RadioNode
  | PopoverNode
  | TooltipNode
  | ImageGroupNode
  | TextNode
  | ContainerNode
  | IconNode
  | EntityListNode
  | MetaNode
  | ImageNode
  | CarouselNode
  | EntityRefNode
  | ButtonNode
  | InputNode
  | SelectNode
  | SliderNode
  | SwitchNode
  | ComputedNode
  | ConditionalNode
  | TabsNode
  | TableNode
  | ChartNode
  | CalloutNode
  | DividerNode
  | CodeNode;
export interface RichSpec {
  version: 1;
  title?: string;
  nodes: RichNode[];
  entities?: Entity[];
  initialState?: Record<string, Scalar>;
}
export const LIMITS = Object.freeze({
  depth: 48,
  values: 20000,
  nodes: 1000,
  expressionDepth: 24,
  expressionNodes: 256,
  string: 16384,
  array: 1000,
  stateKeys: 128,
  evaluationSteps: 2048,
});
export class RichValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RichValidationError";
  }
}
const fail = (message: string): never => {
  throw new RichValidationError(message);
};
const forbidden = new Set(["__proto__", "prototype", "constructor"]);
const sensitive =
  /^(?:password|passwd|secret|token|api[_-]?key|access[_-]?token|recovery[_-]?code)$/i;
export function assertSafeKey(key: string): void {
  if (
    !/^[a-zA-Z_][a-zA-Z0-9_-]{0,63}$/.test(key) ||
    forbidden.has(key) ||
    sensitive.test(key)
  )
    fail(`Unsafe key: ${key}`);
}
export function assertSafeUrl(value: string): void {
  if (value.length > 2048 || /[\u0000-\u0020\u007f]/.test(value))
    fail("Invalid URL");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return fail("Invalid URL");
  }
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    fail("URL protocol or credentials forbidden");
}
/** Clone before validation: reject accessors, exotic prototypes, cycles and pollution keys. */
function jsonClone(input: unknown): unknown {
  let count = 0;
  let characters = 0;
  const seen = new WeakSet<object>();
  function visit(value: unknown, depth: number): unknown {
    if (++count > LIMITS.values || depth > LIMITS.depth)
      fail("Document budget exceeded");
    if (value === null || typeof value === "boolean") return value;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) fail("Non-finite number");
      return value;
    }
    if (typeof value === "string") {
      characters += value.length;
      if (value.length > LIMITS.string || characters > 1_000_000)
        fail("String budget exceeded");
      return value;
    }
    if (typeof value !== "object") return fail("Only JSON values allowed");
    if (seen.has(value)) fail("Cycles or shared objects forbidden");
    seen.add(value);
    if (Array.isArray(value)) {
      if (
        Object.getPrototypeOf(value) !== Array.prototype ||
        Object.getOwnPropertySymbols(value).length
      )
        fail("Invalid array prototype or symbols");
      if (value.length > LIMITS.array) fail("Array too long");
      const descriptors = Object.getOwnPropertyDescriptors(value);
      if (Object.keys(descriptors).length !== value.length + 1)
        fail("Invalid array properties");
      return Array.from({ length: value.length }, (_, i) => {
        const d = descriptors[String(i)];
        if (!d || !("value" in d))
          return fail("Sparse arrays or accessors forbidden");
        return visit(d.value, depth + 1);
      });
    }
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) fail("Non-plain object");
    if (Object.getOwnPropertySymbols(value).length) fail("Symbols forbidden");
    const out: Record<string, unknown> = Object.create(null);
    for (const [key, d] of Object.entries(
      Object.getOwnPropertyDescriptors(value),
    )) {
      if (forbidden.has(key) || sensitive.test(key))
        fail("Forbidden object key");
      if (!("value" in d) || !d.enumerable)
        fail("Accessors or hidden fields forbidden");
      out[key] = visit(d.value, depth + 1);
    }
    return out;
  }
  return visit(input, 0);
}
type Obj = Record<string, unknown>;
function obj(v: unknown): Obj {
  if (!v || typeof v !== "object" || Array.isArray(v)) fail("Expected object");
  return v as Obj;
}
function fields(v: Obj, required: string[], optional: string[] = []): void {
  for (const k of required) if (!Object.hasOwn(v, k)) fail(`Missing ${k}`);
  for (const k of Object.keys(v))
    if (![...required, ...optional].includes(k)) fail(`Unknown field: ${k}`);
}
function str(v: unknown): asserts v is string {
  if (typeof v !== "string") fail("Expected string");
}
function num(v: unknown, min = -1e12, max = 1e12): asserts v is number {
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max)
    fail("Number out of bounds");
}
function scalar(v: unknown): void {
  if (v !== null && !["string", "number", "boolean"].includes(typeof v))
    fail("Expected scalar");
  if (typeof v === "number") num(v);
}
function arr(v: unknown, fn: (item: unknown) => void): void {
  if (!Array.isArray(v)) fail("Expected array");
  (v as unknown[]).forEach(fn);
}
function choice(v: unknown, options: readonly string[]): void {
  if (typeof v !== "string" || !options.includes(v)) fail("Invalid enum value");
}
function key(v: unknown): void {
  str(v);
  assertSafeKey(v);
}
function url(v: unknown): void {
  str(v);
  assertSafeUrl(v);
}
export const OP_ARITY: Readonly<Record<ExprOp, readonly [number, number]>> =
  Object.freeze({
    add: [2, 32],
    sub: [2, 2],
    mul: [2, 32],
    div: [2, 2],
    mod: [2, 2],
    pow: [2, 2],
    min: [1, 32],
    max: [1, 32],
    abs: [1, 1],
    round: [1, 2],
    floor: [1, 1],
    ceil: [1, 1],
    eq: [2, 2],
    ne: [2, 2],
    gt: [2, 2],
    gte: [2, 2],
    lt: [2, 2],
    lte: [2, 2],
    and: [2, 32],
    or: [2, 32],
    not: [1, 1],
    concat: [1, 32],
    format: [1, 32],
  });
/** Validate standalone expressions as well as expressions embedded in specs. */
export function validateExpr(input: unknown): asserts input is Expr {
  let count = 0;
  function visit(v: unknown, depth: number): void {
    if (++count > LIMITS.expressionNodes || depth > LIMITS.expressionDepth)
      fail("Expression budget exceeded");
    if (v === null || typeof v !== "object") {
      scalar(v);
      if (typeof v === "number") num(v);
      if (typeof v === "string" && v.length > LIMITS.string)
        fail("String too long");
      return;
    }
    const o = obj(v);
    if (Object.hasOwn(o, "state")) {
      fields(o, ["state"]);
      key(o.state);
      return;
    }
    fields(o, ["op", "args"]);
    if (typeof o.op !== "string" || !Object.hasOwn(OP_ARITY, o.op))
      fail("Unknown expression operation");
    const [min, max] = OP_ARITY[o.op as ExprOp];
    if (!Array.isArray(o.args) || o.args.length < min || o.args.length > max)
      fail("Wrong operation arity");
    (o.args as unknown[]).forEach((x) => visit(x, depth + 1));
  }
  visit(jsonClone(input), 0);
}
function action(v: unknown): void {
  const o = obj(v);
  switch (o.type) {
    case "set":
      fields(o, ["type", "key", "value"]);
      key(o.key);
      validateExpr(o.value);
      break;
    case "toggle":
      fields(o, ["type", "key"]);
      key(o.key);
      break;
    case "reset":
    case "close-entity":
      fields(o, ["type"]);
      break;
    case "open-entity":
      fields(o, ["type", "entityId"]);
      key(o.entityId);
      break;
    case "copy":
    case "send-message":
      fields(o, ["type", "text"]);
      validateExpr(o.text);
      break;
    case "open-url":
      fields(o, ["type", "url"]);
      url(o.url);
      break;
    default:
      fail("Unknown action");
  }
}
/** Parse untrusted input; never silently accepts unknown fields. Does not execute actions. */
export function parseRichSpec(input: unknown): RichSpec {
  const root = obj(jsonClone(input));
  fields(root, ["version", "nodes"], ["title", "entities", "initialState"]);
  if (root.version !== 1) fail("Unsupported spec version");
  if (root.title !== undefined) str(root.title);
  const entityIds = new Set<string>();
  const refs: string[] = [];
  const nodeIds = new Set<string>();
  let nodeCount = 0;
  if (root.entities !== undefined)
    arr(root.entities, (v) => {
      const e = obj(v);
      fields(
        e,
        ["id", "kind", "title"],
        [
          "subtitle",
          "description",
          "image",
          "images",
          "facts",
          "sources",
          "related",
          "badge",
        ],
      );
      key(e.id);
      str(e.kind);
      str(e.title);
      if (entityIds.has(e.id as string)) fail("Duplicate entity id");
      entityIds.add(e.id as string);
      for (const k of ["subtitle", "description"])
        if (e[k] !== undefined) str(e[k]);
      if (e.image !== undefined) url(e.image);
      if (e.images !== undefined) arr(e.images, url);
      if (e.facts !== undefined)
        arr(e.facts, (f) => {
          const x = obj(f);
          fields(x, ["label", "value"]);
          str(x.label);
          scalar(x.value);
        });
      if (e.sources !== undefined)
        arr(e.sources, (f) => {
          const x = obj(f);
          fields(x, ["title", "url"]);
          str(x.title);
          url(x.url);
        });
      if (e.badge !== undefined) {
        const badge = obj(e.badge);
        fields(badge, ["label"], ["tone"]);
        str(badge.label);
        if (badge.tone !== undefined)
          choice(badge.tone, [
            "success",
            "info",
            "warning",
            "danger",
            "accent",
          ]);
      }
      if (e.related !== undefined)
        arr(e.related, (r) => {
          key(r);
          refs.push(r as string);
        });
    });
  if (root.initialState !== undefined) {
    const state = obj(root.initialState);
    if (Object.keys(state).length > LIMITS.stateKeys)
      fail("Too many state keys");
    for (const [k, v] of Object.entries(state)) {
      assertSafeKey(k);
      scalar(v);
    }
  }
  function node(value: unknown): void {
    if (++nodeCount > LIMITS.nodes) fail("Node budget exceeded");
    const o = obj(value);
    const optional = ["id"];
    const check = (required: string[], extra: string[] = []) =>
      fields(o, ["type", ...required], [...optional, ...extra]);
    if (o.id !== undefined) {
      key(o.id);
      if (nodeIds.has(o.id as string)) fail("Duplicate node id");
      nodeIds.add(o.id as string);
    }
    switch (o.type) {
      case "text":
        check(["content"], ["variant"]);
        validateExpr(o.content);
        if (o.variant !== undefined)
          choice(o.variant, ["body", "title", "subtitle", "caption"]);
        break;
      case "stack":
      case "row":
      case "grid":
      case "card":
        check(["children"], ["gap", "columns", "title"]);
        arr(o.children, node);
        if (o.gap !== undefined) num(o.gap, 0, 128);
        if (o.columns !== undefined) {
          num(o.columns, 1, 12);
          if (!Number.isInteger(o.columns)) fail("Columns must be integer");
        }
        if (o.title !== undefined) str(o.title);
        break;
      case "popover":
        check(["label", "children"]);
        str(o.label);
        arr(o.children, node);
        break;
      case "tooltip":
        check(["label", "text"]);
        str(o.label);
        str(o.text);
        break;
      case "image-group":
        check(["src", "alt"], ["label"]);
        arr(o.src, url);
        str(o.alt);
        if (o.label !== undefined) str(o.label);
        break;
      case "carousel":
        check(["children"]);
        arr(o.children, node);
        break;
      case "icon":
        check(["name"], ["size", "tone"]);
        str(o.name);
        if (!/^[a-zA-Z][a-zA-Z0-9-]{0,63}$/.test(o.name)) fail("Invalid icon");
        if (o.size !== undefined) num(o.size, 8, 128);
        if (o.tone !== undefined)
          choice(o.tone, [
            "default",
            "muted",
            "success",
            "warning",
            "danger",
            "info",
            "accent",
          ]);
        break;
      case "meta": {
        check(["items"]);
        if (!Array.isArray(o.items) || o.items.length === 0)
          fail("Meta strip cannot be empty");
        arr(o.items, (value) => {
          const item = obj(value);
          fields(item, ["text"], ["icon"]);
          str(item.text);
          if (item.icon !== undefined) {
            str(item.icon);
            if (!/^[a-zA-Z][a-zA-Z0-9-]{0,63}$/.test(item.icon))
              fail("Invalid meta icon");
          }
        });
        break;
      }
      case "entity-list": {
        check(["entityIds"]);
        if (!Array.isArray(o.entityIds) || o.entityIds.length === 0)
          fail("Entity list cannot be empty");
        arr(o.entityIds, (value) => {
          key(value);
          refs.push(value as string);
        });
        break;
      }
      case "image":
        check(["src", "alt"], ["caption"]);
        url(o.src);
        str(o.alt);
        if (o.caption !== undefined) str(o.caption);
        break;
      case "entity-ref":
        check(["entityId"]);
        key(o.entityId);
        refs.push(o.entityId as string);
        break;
      case "button":
        check(["label", "action"], ["variant", "disabled"]);
        str(o.label);
        action(o.action);
        if ((o.action as Obj).type === "open-entity")
          refs.push((o.action as Obj).entityId as string);
        if (o.variant !== undefined)
          choice(o.variant, ["primary", "secondary", "ghost"]);
        if (o.disabled !== undefined) validateExpr(o.disabled);
        break;
      case "input":
        check(["stateKey"], ["label", "placeholder", "inputType"]);
        key(o.stateKey);
        if (o.label !== undefined) str(o.label);
        if (o.placeholder !== undefined) str(o.placeholder);
        if (o.inputType !== undefined)
          choice(o.inputType, ["text", "number", "date"]);
        break;
      case "checkbox":
        check(["stateKey", "label"]);
        key(o.stateKey);
        str(o.label);
        break;
      case "radio":
      case "segmented":
      case "select":
        check(["stateKey", "options"], ["label"]);
        key(o.stateKey);
        if (o.label !== undefined) str(o.label);
        if (!Array.isArray(o.options) || o.options.length === 0)
          fail("Options cannot be empty");
        arr(o.options, (x) => {
          const p = obj(x);
          fields(p, ["label", "value"]);
          str(p.label);
          scalar(p.value);
          if (p.value === null) fail("Option value cannot be null");
        });
        break;
      case "slider":
        check(["stateKey", "min", "max"], ["label", "step"]);
        key(o.stateKey);
        num(o.min);
        num(o.max);
        if ((o.min as number) >= (o.max as number))
          fail("Invalid slider range");
        if (o.step !== undefined) num(o.step, Number.MIN_VALUE);
        if (o.label !== undefined) str(o.label);
        break;
      case "switch":
        check(["stateKey"], ["label"]);
        key(o.stateKey);
        if (o.label !== undefined) str(o.label);
        break;
      case "computed":
        check(["expr"], ["label"]);
        validateExpr(o.expr);
        if (o.label !== undefined) str(o.label);
        break;
      case "conditional":
        check(["when", "children"], ["elseChildren"]);
        validateExpr(o.when);
        arr(o.children, node);
        if (o.elseChildren !== undefined) arr(o.elseChildren, node);
        break;
      case "tabs": {
        check(["stateKey", "tabs"]);
        key(o.stateKey);
        const ids = new Set<string>();
        arr(o.tabs, (t) => {
          const p = obj(t);
          fields(p, ["id", "label", "children"]);
          key(p.id);
          str(p.label);
          if (ids.has(p.id as string)) fail("Duplicate tab id");
          ids.add(p.id as string);
          arr(p.children, node);
        });
        break;
      }
      case "table": {
        check(["columns", "rows"]);
        const keys = new Set<string>();
        arr(o.columns, (c) => {
          const p = obj(c);
          fields(p, ["key", "label"]);
          key(p.key);
          str(p.label);
          if (keys.has(p.key as string)) fail("Duplicate column");
          keys.add(p.key as string);
        });
        arr(o.rows, (r) => {
          for (const [k, v] of Object.entries(obj(r))) {
            if (!keys.has(k)) fail("Unknown table column");
            validateExpr(v);
          }
        });
        break;
      }
      case "chart":
        check(["kind", "data"]);
        choice(o.kind, ["bar", "line", "donut"]);
        arr(o.data, (d) => {
          const p = obj(d);
          fields(p, ["label", "value"]);
          str(p.label);
          validateExpr(p.value);
        });
        break;
      case "callout":
        check(["content"], ["tone", "title"]);
        if (o.title !== undefined) str(o.title);
        validateExpr(o.content);
        if (o.tone !== undefined)
          choice(o.tone, ["info", "success", "warning", "error"]);
        break;
      case "divider":
        check([], ["label"]);
        if (o.label !== undefined) str(o.label);
        break;
      case "code":
        check(["code"], ["language"]);
        str(o.code);
        if (o.language !== undefined) str(o.language);
        break;
      default:
        fail("Unknown node type");
    }
  }
  arr(root.nodes, node);
  for (const id of refs) if (!entityIds.has(id)) fail(`Unknown entity: ${id}`);
  return root as unknown as RichSpec;
}
