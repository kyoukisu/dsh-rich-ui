/** Safe JSON-only contract. No HTML, scripts, arbitrary styles or property paths. */
export type Scalar = string | number | boolean | null;
/** Semantic colour only. Arbitrary colours would break one of the two themes. */
export type Tone =
  "default" | "muted" | "success" | "warning" | "danger" | "info" | "accent";
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
  /** Short highlight under the row, e.g. "Cheapest". */
  badge?: EntityBadge;
  /** Row thumbnail shape; posters are 2:3, square suits product photos. */
  thumbShape?: "poster" | "square";
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
  tone?: Tone;
}
/** KPI card: one number the reader should remember, with optional change. */
export interface StatNode extends NodeBase {
  type: "stat";
  label: string;
  value: Expr;
  /** Number is read as a percentage change; a string is shown verbatim. */
  delta?: Expr;
  deltaLabel?: string;
  hint?: string;
  tone?: Exclude<Tone, "muted" | "info">;
  icon?: string;
}
export interface ProgressNode extends NodeBase {
  type: "progress";
  value: Expr;
  max?: number;
  label?: string;
  tone?: Exclude<Tone, "default" | "accent"> | "accent";
  showValue?: boolean;
}
/** Compact state pill, e.g. "Done" or "In progress". */
export interface StatusNode extends NodeBase {
  type: "status";
  label: string;
  tone?: Exclude<Tone, "default">;
}
export interface DiagramStep {
  id: string;
  label: string;
  detail?: string;
  tone?: Exclude<Tone, "default">;
  /** Caption of the arrow that leads into this step. */
  connector?: string;
  /** 0 is the main line; 1–2 render as a branch. */
  depth?: 0 | 1 | 2;
}
/** Ordered flow: process, pipeline or architecture. Not a free-form graph editor. */
export interface DiagramNode extends NodeBase {
  type: "diagram";
  steps: DiagramStep[];
  direction?: "horizontal" | "vertical";
  caption?: string;
}
export interface LayerItem {
  label: string;
  detail?: string;
  icon?: string;
  tone?: Exclude<Tone, "default">;
}
/** One box in a stacked architecture. Set items or nested layers, not both. */
export interface Layer {
  title: string;
  detail?: string;
  icon?: string;
  tone?: Exclude<Tone, "default">;
  items?: LayerItem[];
  layers?: Layer[];
}
/** Stacked architecture: nested boxes from top to bottom, with inline members. */
export interface LayersNode extends NodeBase {
  type: "layers";
  layers: Layer[];
  caption?: string;
}
export interface MetaItem {
  text: string;
  icon?: string;
}
/** Compact inline summary strip: "4 models · From $15 · Delivery Nov 7–18". */
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
export type TableFormat = "text" | "number" | "status" | "progress";
export interface TableColumn {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  /** `status` renders a tone pill; `number` groups digits and aligns right. */
  format?: TableFormat;
  /** For `status`: maps a cell's display string to a semantic tone. */
  tones?: Record<string, Exclude<Tone, "default">>;
  /** For `progress`: value that fills the bar; defaults to 100. */
  max?: number;
  /** For `progress`: bar colour. */
  tone?: "accent" | "success" | "warning" | "danger" | "info";
}
export interface TableNode extends NodeBase {
  type: "table";
  columns: TableColumn[];
  rows: Record<string, Expr>[];
  /** Client-side sorting by column; no model call. */
  sortable?: boolean;
  /** Client-side substring filter across visible cells. */
  filterable?: boolean;
  filterPlaceholder?: string;
  caption?: string;
  empty?: string;
}
export interface ChartSeries {
  label: string;
  values: Expr[];
}
export interface ChartNode extends NodeBase {
  type: "chart";
  kind: "bar" | "line" | "area" | "donut";
  /** Single-series data, or the slice labels for a donut. */
  data?: { label: string; value: Expr }[];
  /** Multi-series mode: one shared category axis plus aligned value arrays. */
  categories?: string[];
  series?: ChartSeries[];
  /** Shown on the value axis and in tooltips, e.g. "$" or "$k". */
  unit?: string;
  caption?: string;
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
  title?: string;
  lineNumbers?: boolean;
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
  | StatNode
  | ProgressNode
  | StatusNode
  | DiagramNode
  | LayersNode
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
/** Every tone the icon node accepts; kept as one list so enums cannot drift. */
const TONES = [
  "default",
  "muted",
  "success",
  "warning",
  "danger",
  "info",
  "accent",
] as const;
const BRIGHT_TONES = [
  "muted",
  "success",
  "warning",
  "danger",
  "info",
  "accent",
] as const;
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
          "thumbShape",
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
      if (e.thumbShape !== undefined)
        choice(e.thumbShape, ["poster", "square"]);
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
        if (o.tone !== undefined) choice(o.tone, TONES);
        break;
      case "stat":
        check(
          ["label", "value"],
          ["delta", "deltaLabel", "hint", "tone", "icon"],
        );
        str(o.label);
        validateExpr(o.value);
        if (o.delta !== undefined) validateExpr(o.delta);
        for (const k of ["deltaLabel", "hint"])
          if (o[k] !== undefined) str(o[k]);
        if (o.tone !== undefined)
          choice(o.tone, ["success", "warning", "danger", "accent"]);
        if (o.icon !== undefined) {
          str(o.icon);
          if (!/^[a-zA-Z][a-zA-Z0-9-]{0,63}$/.test(o.icon))
            fail("Invalid stat icon");
        }
        break;
      case "progress":
        check(["value"], ["max", "label", "tone", "showValue"]);
        validateExpr(o.value);
        if (o.max !== undefined) num(o.max, Number.MIN_VALUE);
        if (o.label !== undefined) str(o.label);
        if (o.tone !== undefined)
          choice(o.tone, ["success", "warning", "danger", "info", "accent"]);
        if (o.showValue !== undefined && typeof o.showValue !== "boolean")
          fail("Expected boolean");
        break;
      case "status":
        check(["label"], ["tone"]);
        str(o.label);
        if (o.tone !== undefined)
          choice(o.tone, [
            "muted",
            "success",
            "warning",
            "danger",
            "info",
            "accent",
          ]);
        break;
      case "diagram": {
        check(["steps"], ["direction", "caption"]);
        if (o.direction !== undefined)
          choice(o.direction, ["horizontal", "vertical"]);
        if (o.caption !== undefined) str(o.caption);
        if (!Array.isArray(o.steps) || o.steps.length === 0)
          fail("Diagram needs steps");
        if ((o.steps as unknown[]).length > 12) fail("Too many diagram steps");
        const ids = new Set<string>();
        arr(o.steps, (value) => {
          const step = obj(value);
          fields(
            step,
            ["id", "label"],
            ["detail", "tone", "connector", "depth"],
          );
          key(step.id);
          str(step.label);
          if (ids.has(step.id as string)) fail("Duplicate diagram step");
          ids.add(step.id as string);
          if (step.detail !== undefined) str(step.detail);
          if (step.tone !== undefined) choice(step.tone, BRIGHT_TONES);
          if (step.connector !== undefined) str(step.connector);
          if (step.depth !== undefined) {
            num(step.depth, 0, 2);
            if (!Number.isInteger(step.depth)) fail("Depth must be integer");
          }
        });
        break;
      }
      case "layers": {
        check(["layers"], ["caption"]);
        if (o.caption !== undefined) str(o.caption);
        const walk = (value: unknown, depth: number) => {
          if (!Array.isArray(value) || value.length === 0)
            fail("Layers need entries");
          const entries = value as unknown[];
          if (entries.length > 6) fail("Too many layers");
          arr(entries, (entry) => {
            const layer = obj(entry);
            fields(layer, ["title"], [
              "detail",
              "icon",
              "tone",
              "items",
              "layers",
            ]);
            str(layer.title);
            if (layer.detail !== undefined) str(layer.detail);
            if (layer.icon !== undefined) str(layer.icon);
            if (layer.tone !== undefined) choice(layer.tone, BRIGHT_TONES);
            if (layer.items !== undefined) {
              if (!Array.isArray(layer.items) || layer.items.length === 0)
                fail("Layer items cannot be empty");
              const members = layer.items as unknown[];
              if (members.length > 6) fail("Too many layer items");
              arr(members, (member) => {
                const item = obj(member);
                fields(item, ["label"], ["detail", "icon", "tone"]);
                str(item.label);
                if (item.detail !== undefined) str(item.detail);
                if (item.icon !== undefined) str(item.icon);
                if (item.tone !== undefined) choice(item.tone, BRIGHT_TONES);
              });
            }
            if (layer.layers !== undefined) {
              if (depth >= 2) fail("Layers nest too deep");
              walk(layer.layers, depth + 1);
            }
            if (layer.items !== undefined && layer.layers !== undefined)
              fail("A layer cannot hold items and nested layers together");
          });
        };
        walk(o.layers, 0);
        break;
      }
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
        check(
          ["columns", "rows"],
          ["sortable", "filterable", "filterPlaceholder", "caption", "empty"],
        );
        const keys = new Set<string>();
        arr(o.columns, (c) => {
          const p = obj(c);
          fields(
            p,
            ["key", "label"],
            ["align", "format", "tones", "max", "tone"],
          );
          key(p.key);
          str(p.label);
          if (p.align !== undefined)
            choice(p.align, ["left", "right", "center"]);
          if (p.format !== undefined)
            choice(p.format, ["text", "number", "status", "progress"]);
          if (p.max !== undefined) {
            num(p.max, Number.MIN_VALUE);
            if (p.format !== "progress") fail("max requires format: progress");
          }
          if (p.tone !== undefined) {
            choice(p.tone, ["accent", "success", "warning", "danger", "info"]);
            if (p.format !== "progress") fail("tone requires format: progress");
          }
          if (p.tones !== undefined) {
            if (p.format !== undefined && p.format !== "status")
              fail("tones require format: status");
            const tones = obj(p.tones);
            const entries = Object.entries(tones);
            if (entries.length === 0 || entries.length > 32)
              fail("Invalid tone map size");
            for (const [label, tone] of entries) {
              if (label.length === 0 || label.length > 64)
                fail("Invalid tone label");
              choice(tone, BRIGHT_TONES);
            }
          }
          if (keys.has(p.key as string)) fail("Duplicate column");
          keys.add(p.key as string);
        });
        arr(o.rows, (r) => {
          for (const [k, v] of Object.entries(obj(r))) {
            if (!keys.has(k)) fail("Unknown table column");
            validateExpr(v);
          }
        });
        for (const k of ["sortable", "filterable"])
          if (o[k] !== undefined && typeof o[k] !== "boolean")
            fail("Expected boolean");
        if (o.filterPlaceholder !== undefined) {
          str(o.filterPlaceholder);
          if (o.filterable !== true) fail("filterPlaceholder needs filterable");
        }
        if (o.caption !== undefined) str(o.caption);
        if (o.empty !== undefined) str(o.empty);
        break;
      }
      case "chart": {
        check(["kind"], ["data", "categories", "series", "unit", "caption"]);
        choice(o.kind, ["bar", "line", "area", "donut"]);
        if (o.data === undefined && o.series === undefined)
          fail("Chart needs data or series");
        if (o.data !== undefined) {
          if (!Array.isArray(o.data) || o.data.length === 0)
            fail("Chart data cannot be empty");
          arr(o.data, (d) => {
            const p = obj(d);
            fields(p, ["label", "value"]);
            str(p.label);
            validateExpr(p.value);
          });
        }
        if (o.series !== undefined) {
          if (o.kind === "donut") fail("Donut uses data only");
          if (!Array.isArray(o.categories) || o.categories.length === 0)
            fail("Series needs categories");
          arr(o.categories, str);
          const length = (o.categories as unknown[]).length;
          if (!Array.isArray(o.series) || o.series.length === 0)
            fail("Series cannot be empty");
          if ((o.series as unknown[]).length > 6) fail("Too many chart series");
          arr(o.series, (s) => {
            const p = obj(s);
            fields(p, ["label", "values"]);
            str(p.label);
            if (!Array.isArray(p.values) || p.values.length !== length)
              fail("Series length must match categories");
            (p.values as unknown[]).forEach(validateExpr);
          });
        }
        if (o.unit !== undefined) str(o.unit);
        if (o.caption !== undefined) str(o.caption);
        break;
      }
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
        check(["code"], ["language", "title", "lineNumbers"]);
        str(o.code);
        if (o.language !== undefined) str(o.language);
        if (o.title !== undefined) str(o.title);
        if (o.lineNumbers !== undefined && typeof o.lineNumbers !== "boolean")
          fail("Expected boolean");
        break;
      default:
        fail("Unknown node type");
    }
  }
  arr(root.nodes, node);
  for (const id of refs) if (!entityIds.has(id)) fail(`Unknown entity: ${id}`);
  return root as unknown as RichSpec;
}
