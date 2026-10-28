# RichSpec v1 field reference

Read before using an unfamiliar node. These are exact current parser fields; fields not listed are forbidden. `?` below denotes an optional field, not literal JSON syntax. `Scalar` means string, bounded finite number, boolean or null. `Expr` means Scalar, `{state: KEY}`, or `{op: OP, args: Expr[]}`. All node records may also contain a unique safe `id`.

## Root and entities

Root: `{version: 1, nodes: Node[], title?: string, entities?: Entity[], initialState?: Record<KEY, Scalar>}`.

Entity: `{id: KEY, kind: string, title: string, subtitle?: string, description?: string, image?: URL, images?: URL[], facts?: {label: string, value: Scalar}[], sources?: {title: string, url: URL}[], related?: KEY[]}`. IDs must be unique; every entity-ref, related target and open-entity action target must exist. Entity titles/descriptions are literal strings, not Expr.

## Nodes

- `text`: `{type:"text",content:Expr,variant?:"body"|"title"|"subtitle"|"caption"}`.
- Layout: `{type:"stack"|"row"|"grid"|"card",children:Node[],gap?:number,columns?:integer,title?:string}`. Gap 0–128; columns 1–12. The field is `children`, never `items`.
- `carousel`: `{type:"carousel",children:Node[]}`.
- `icon`: `{type:"icon",name:string,size?:number}`. Size 8–128; name starts with a letter and contains only letters/digits/hyphen, up to 64 characters. Use Lucide PascalCase names. No inline SVG.
- `image`: `{type:"image",src:URL,alt:string,caption?:string}`.
- `image-group`: `{type:"image-group",src:URL[],alt:string,label?:string}`. The `src` field is an array, unlike image; no `images`, `children` or caption field.
- `popover`: `{type:"popover",label:string,children:Node[]}`. Local disclosure for supplemental content; no action or stateKey required.
- `tooltip`: `{type:"tooltip",label:string,text:string}`. Short plain-string explanation; no children, content, HTML or expression-valued text.
- `entity-ref`: `{type:"entity-ref",entityId:KEY}`.
- `button`: `{type:"button",label:string,action:Action,variant?:"primary"|"secondary"|"ghost",disabled?:Expr}`.
- `input`: `{type:"input",stateKey:KEY,label?:string,placeholder?:string,inputType?:"text"|"number"}`.
- `select`: `{type:"select",stateKey:KEY,options:{label:string,value:Scalar}[],label?:string}`.
- `slider`: `{type:"slider",stateKey:KEY,min:number,max:number,label?:string,step?:number}`. Min must be less than max; step positive.
- `switch`: `{type:"switch",stateKey:KEY,label?:string}`.
- `computed`: `{type:"computed",expr:Expr,label?:string}`.
- `conditional`: `{type:"conditional",when:Expr,children:Node[],elseChildren?:Node[]}`.
- `tabs`: `{type:"tabs",stateKey:KEY,tabs:{id:KEY,label:string,children:Node[]}[]}`. Tab IDs unique inside the node.
- `table`: `{type:"table",columns:{key:KEY,label:string}[],rows:Record<KEY,Expr>[]}`. Column keys unique; row fields must refer to listed column keys. A missing cell is allowed. Rows are objects, not positional arrays.
- `chart`: `{type:"chart",kind:"bar"|"line"|"donut",data:{label:string,value:Expr}[]}`. Singular `bar`, not GenUI `bars`. No series/options passthrough.
- `callout`: `{type:"callout",content:Expr,tone?:"info"|"success"|"warning"|"error"}`.
- `divider`: `{type:"divider",label?:string}`.
- `code`: `{type:"code",code:string,language?:string}`. Displays code as text; never executes it.

## Actions

- `{type:"set",key:KEY,value:Expr}`: update one state scalar locally.
- `{type:"toggle",key:KEY}`: invert local truthiness.
- `{type:"reset"}`: restore document defaults and clear saved state.
- `{type:"open-entity",entityId:KEY}` / `{type:"close-entity"}`: local detail panel.
- `{type:"copy",text:Expr}`: browser clipboard after click.
- `{type:"open-url",url:URL}`: external HTTP(S) link after click.
- `{type:"send-message",text:Expr}`: explicit model callback through host conversation.

No arbitrary named actions, callbacks, scripts, submit fields, network requests or DOM selectors are accepted.

## Expression operations and exact arities

Binary: `sub`, `div`, `mod`, `pow`, `eq`, `ne`, `gt`, `gte`, `lt`, `lte` take exactly 2 arguments. `add`, `mul`, `and`, `or` take 2–32. `min`, `max`, `concat`, `format` take 1–32. `abs`, `floor`, `ceil`, `not` take exactly 1. `round` takes 1 or 2 (second is integer digits 0–12). Numeric inputs/results stay within ±1e12. Division/modulo by zero and excessive exponents fail. Equality is strict; no implicit numeric conversion. `and`/`or` short-circuit and return booleans. Missing state resolves to null; initialize numeric controls explicitly. `concat` converts scalars to strings, with null as empty. `format` uses a literal first-argument template with positional placeholders `{0}`, `{1}`, etc.; remaining arguments fill them. No property access/interpolation is evaluated.

Example: `{"op":"format","args":["Total: {0}",{"op":"mul","args":[{"state":"count"},25]}]}`.

## Defaults, limits and trust boundary

Explicit initialState wins. Missing control defaults: text input empty string; numeric input zero; select first option value or null; slider min; switch false; tabs first tab ID or null. State values are scalars, never arrays/objects.

KEY matches `[a-zA-Z_][a-zA-Z0-9_-]{0,63}`. `__proto__`, `prototype`, `constructor` and sensitive key names (password, passwd, secret, token, api-key and similar access-token/recovery-code spellings) are rejected. URLs must be absolute http/https, no embedded username/password, no whitespace/control characters, at most 2048 characters.

Current upper budgets: source 256,000 characters in host adapter; nesting 48; 20,000 JSON values; 1,000 nodes; arrays up to 1,000; 128 state keys; strings up to 16,384 characters and aggregate 1,000,000; expressions depth 24 and 256 expression nodes; evaluation 2048 steps. These are ceilings, not design targets. Unknown fields reject the full spec; no partial component dropping or JSON repair.
