import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Copy, Wrench } from "lucide-react";

export interface DiagnosticProps {
  /** Validator message; plain text, never HTML. */
  error: string;
  /** Rejected fence source, shown behind a disclosure and sent back on repair. */
  source: string;
  /** Sends the error and source back to the owning session; absent without one. */
  onRepair?: () => void;
}

const SHOWN = 20_000;

/** Plain-language summary; the exact validator text stays visible below. */
export function explain(error: string): string {
  const missing = /^Missing ([A-Za-z0-9_]+)$/.exec(error);
  if (missing) return `Missing required field "${missing[1]}".`;
  const unknown = /^Unknown field: (.+)$/.exec(error);
  if (unknown) return `Unknown field "${unknown[1]}".`;
  const entity = /^Unknown entity: (.+)$/.exec(error);
  if (entity) return `Reference to a missing entity "${entity[1]}".`;
  if (/^Unknown node type/.test(error)) return "Unknown block type.";
  if (/^Unsupported spec version/.test(error))
    return "Unsupported document version.";
  if (/^Duplicate /.test(error)) return "Duplicate identifier.";
  if (/URL|protocol/.test(error)) return "Invalid link.";
  if (/budget|too long|too many|exceeded/i.test(error))
    return "Document exceeds the size limit.";
  if (/^Expected /.test(error)) return "Wrong value type.";
  if (/^Invalid enum value/.test(error))
    return "Value is not in the allowed set.";
  if (/^Number out of bounds/.test(error))
    return "Number is out of range.";
  return "Document does not match the schema.";
}

/**
 * A claimed rich-ui fence that the strict parser rejected. The code block stays
 * hidden because this card carries the same source plus the actionable reason;
 * nothing is repaired or executed silently.
 */
export function Diagnostic({ error, source, onRepair }: DiagnosticProps) {
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");
  const [sent, setSent] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `rich-ui error: ${error}\n\n${source}`,
      );
      setCopied("done");
    } catch {
      setCopied("failed");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied("idle"), 2200);
  };
  const visible =
    source.length > SHOWN ? `${source.slice(0, SHOWN)}\n…truncated` : source;
  return (
    <section className="rich-ui ru-diagnostic" aria-label="rich-ui error">
      <header className="ru-diagnostic-head">
        <AlertTriangle size={18} aria-hidden="true" />
        <div>
          <strong>Rich block not parsed</strong>
          <span>The document failed schema validation. The source is kept below.</span>
        </div>
      </header>
      <p className="ru-diagnostic-summary">{explain(error)}</p>
      <p className="ru-diagnostic-error">
        <span>Schema:</span> {error}
      </p>
      <div className="ru-diagnostic-actions">
        <button type="button" className="ru-button" onClick={() => void copy()}>
          {copied === "done" ? <Check size={14} /> : <Copy size={14} />}
          <span aria-live="polite">
            {copied === "done"
              ? "Copied"
              : copied === "failed"
                ? "Failed"
                : "Copy error"}
          </span>
        </button>
        {onRepair && (
          <button
            type="button"
            className="ru-button ru-button-primary"
            disabled={sent}
            onClick={() => {
              if (sent) return;
              onRepair();
              setSent(true);
            }}
          >
            <Wrench size={14} />
            {sent ? "Request sent" : "Ask the model to fix"}
          </button>
        )}
      </div>
      <details>
        <summary>Show the source JSON</summary>
        <pre>{visible}</pre>
      </details>
      <p className="ru-diagnostic-note">
        Repair sends the error and the source into the current session — that is
        a model request. The block was never executed or modified.
      </p>
    </section>
  );
}
