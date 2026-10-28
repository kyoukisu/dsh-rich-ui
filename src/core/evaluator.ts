import { assertSafeKey, LIMITS, parseRichSpec, RichValidationError, type Expr, type RichSpec, type Scalar } from './schema';

export class EvaluationError extends Error { constructor(message: string) { super(message); this.name = 'EvaluationError'; } }
const fail = (message: string): never => { throw new EvaluationError(message); };
function numeric(value: Scalar): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > 1e12) return fail('Expected bounded finite number');
  return value;
}
function bounded(value: Scalar): Scalar {
  if (typeof value === 'number' && (!Number.isFinite(value) || Math.abs(value) > 1e12)) return fail('Numeric result out of bounds');
  if (typeof value === 'string' && value.length > LIMITS.string) return fail('String result too long');
  return value;
}
/** Pure bounded evaluator. State lookups are own data properties, never prototype/property paths.
 * Missing state is null; arithmetic is strictly numeric, equality is strict, booleans use JS truthiness.
 * format uses positional {0}, {1}, … placeholders; it never interprets property paths or code.
 */
export function evaluate(expr: Expr, state: Readonly<Record<string, Scalar>> = Object.create(null)): Scalar {
  // Reuse the complete JSON trust boundary even when called outside a parsed document.
  let safe: Expr;
  try { safe = (parseRichSpec({ version: 1, nodes: [{ type: 'computed', expr }] }).nodes[0] as { expr: Expr }).expr; }
  catch (error) { throw new EvaluationError(error instanceof Error ? error.message : 'Invalid expression'); }
  let steps = 0;
  function run(value: Expr): Scalar {
    if (++steps > LIMITS.evaluationSteps) return fail('Evaluation budget exceeded');
    if (value === null || typeof value !== 'object') return bounded(value);
    if ('state' in value) {
      const d = Object.getOwnPropertyDescriptor(state, value.state);
      if (!d) return null;
      if (!('value' in d)) return fail('State accessors forbidden');
      const x: unknown = d.value;
      if (x !== null && !['number','string','boolean'].includes(typeof x)) return fail('State must contain scalars');
      return bounded(x as Scalar);
    }
    const args=value.args;
    // Boolean operations short-circuit, but the entire expression was validated above.
    if (value.op === 'and') { for (const a of args) if (!run(a)) return false; return true; }
    if (value.op === 'or') { for (const a of args) if (run(a)) return true; return false; }
    const a=args.map(run); const n=(i:number)=>numeric(a[i]!);
    let out: Scalar;
    switch(value.op) {
      case 'add': out=a.reduce<number>((s,x)=>numeric(s+numeric(x)),0); break;
      case 'sub': out=n(0)-n(1); break;
      case 'mul': out=a.reduce<number>((s,x)=>numeric(s*numeric(x)),1); break;
      case 'div': if(n(1)===0) return fail('Division by zero'); out=n(0)/n(1); break;
      case 'mod': if(n(1)===0) return fail('Division by zero'); out=n(0)%n(1); break;
      case 'pow': if(Math.abs(n(1))>100) return fail('Exponent out of bounds'); out=Math.pow(n(0),n(1)); break;
      case 'min': out=Math.min(...a.map(numeric)); break;
      case 'max': out=Math.max(...a.map(numeric)); break;
      case 'abs': out=Math.abs(n(0)); break;
      case 'floor': out=Math.floor(n(0)); break;
      case 'ceil': out=Math.ceil(n(0)); break;
      case 'round': { const digits=a.length===2?n(1):0; if(!Number.isInteger(digits)||digits<0||digits>12) return fail('Invalid rounding precision'); const factor=10**digits; out=Math.round(n(0)*factor)/factor; break; }
      case 'eq': out=a[0]===a[1]; break;
      case 'ne': out=a[0]!==a[1]; break;
      case 'gt': out=n(0)>n(1); break;
      case 'gte': out=n(0)>=n(1); break;
      case 'lt': out=n(0)<n(1); break;
      case 'lte': out=n(0)<=n(1); break;
      case 'not': out=!a[0]; break;
      case 'concat': { let s=''; for(const x of a) { s+=String(x??''); if(s.length>LIMITS.string) return fail('String result too long'); } out=s; break; }
      case 'format': {
        if(typeof a[0]!=='string') return fail('Format template must be string');
        let length=0;
        out=a[0].replace(/\{(\d{1,3})\}/g, (_match, index:string)=>{
          const position=Number(index)+1;
          const replacement=position<a.length?String(a[position]??''):'';
          length+=replacement.length; if(length>LIMITS.string) return fail('Format result too long');
          return replacement;
        }); break;
      }
      default: return fail('Unsupported operation');
    }
    return bounded(out);
  }
  return run(safe);
}

/** Explicit initial state wins; infer deterministic defaults for uninitialized controls.
 * Returns a fresh null-prototype record. Conditional branches/tabs are initialized too.
 */
export function getInitialState(input: RichSpec): Record<string, Scalar> {
  const spec=parseRichSpec(input);
  const state:Record<string,Scalar>=Object.create(null);
  for(const [key,value] of Object.entries(spec.initialState??{})) state[key]=value;
  const set=(key:string,value:Scalar)=>{ assertSafeKey(key); if(!Object.hasOwn(state,key)) {
    if(Object.keys(state).length>=LIMITS.stateKeys) throw new RichValidationError('Too many state keys'); state[key]=value;
  }};
  function walk(nodes:RichSpec['nodes']):void {
    for(const node of nodes) {
      switch(node.type) {
        case 'input': set(node.stateKey,node.inputType==='number'?0:''); break;
        case 'select': set(node.stateKey,node.options[0]?.value??null); break;
        case 'slider': set(node.stateKey,node.min); break;
        case 'switch': set(node.stateKey,false); break;
        case 'tabs': set(node.stateKey,node.tabs[0]?.id??null); for(const tab of node.tabs) walk(tab.children); break;
      }
      if('children' in node) walk(node.children);
      if(node.type==='conditional'&&node.elseChildren) walk(node.elseChildren);
    }
  }
  walk(spec.nodes); return state;
}
