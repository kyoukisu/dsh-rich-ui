/** Automatic repair for rejected blocks.
 *
 * A rejected document is already explained in the UI. Sending it back costs a
 * model turn, so the guard is deliberately conservative: one attempt per
 * document, at most two documents per session per hour, never while the block
 * is still streaming, and never for a document that only exceeded the size cap
 * (the model cannot shrink it by rewriting the same text).
 */
export const AUTO_REPAIR_LIMIT = 2;
export const AUTO_REPAIR_WINDOW_MS = 60 * 60 * 1000;

export interface AutoRepairOptions {
  send: (text: string) => Promise<unknown>;
  now?: () => number;
  limit?: number;
  windowMs?: number;
}

export interface AutoRepair {
  /** Returns true when a repair message was queued for this document. */
  consider(input: {
    sessionId: string | undefined;
    source: string;
    error: string;
    streaming: boolean;
  }): boolean;
  /** Test hook: how many messages were queued. */
  sent(): number;
}

const SIZE_ERROR = /longer than \d+ characters/i;

/** Cheap stable hash; collisions only cost one skipped repair. */
function digest(text: string): string {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function createAutoRepair({
  send,
  now = () => Date.now(),
  limit = AUTO_REPAIR_LIMIT,
  windowMs = AUTO_REPAIR_WINDOW_MS,
}: AutoRepairOptions): AutoRepair {
  const seen = new Set<string>();
  const history = new Map<string, number[]>();
  let count = 0;

  return {
    consider({ sessionId, source, error, streaming }) {
      if (!sessionId || streaming) return false;
      if (SIZE_ERROR.test(error)) return false;
      const documentKey = digest(source);
      if (seen.has(documentKey)) return false;
      const stamps = (history.get(sessionId) ?? []).filter(
        (stamp) => now() - stamp < windowMs,
      );
      if (stamps.length >= limit) return false;

      seen.add(documentKey);
      stamps.push(now());
      history.set(sessionId, stamps);
      count += 1;

      const text = `[rich-ui-repair] ${JSON.stringify({
        error: error.slice(0, 500),
        source:
          source.length > 12_000
            ? `${source.slice(0, 12_000)}\n…[truncated]`
            : source,
        truncated: source.length > 12_000,
        automatic: true,
      })}`;
      queueMicrotask(() => {
        void send(text).catch(() =>
          console.warn("[rich-ui] Automatic repair delivery failed"),
        );
      });
      return true;
    },
    sent: () => count,
  };
}
