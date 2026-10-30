import React from "react";
import { ArrowRight } from "lucide-react";
import type {
  DiagramNode,
  ProgressNode,
  StatNode,
  StatusNode,
  Scalar,
} from "../../core/schema";
import { resolveIcon } from "../icons";

/** Grouping starts at five digits so a year (2014) never becomes "2 014".
 * Small values keep significant digits: rounding 0.001 to 0 turns a real
 * metric into a fake zero. */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const magnitude = Math.abs(value);
  if (magnitude > 0 && magnitude < 1e-4) return value.toExponential(2);
  if (magnitude > 0 && magnitude < 0.01)
    return value.toLocaleString("en-US", {
      maximumSignificantDigits: 3,
    });
  return value.toLocaleString("en-US", {
    maximumFractionDigits: 2,
    useGrouping: magnitude >= 10000,
  });
}

export function formatValue(value: Scalar): string {
  if (typeof value === "number") return formatNumber(value);
  if (typeof value === "boolean") return value ? "yes" : "no";
  return String(value ?? "");
}

/** One number the reader should remember, with an optional change. */
export function Stat({
  node,
  value,
  delta,
}: {
  node: StatNode;
  value: Scalar;
  delta?: Scalar;
}) {
  const Icon = node.icon ? resolveIcon(node.icon) : undefined;
  const numeric = typeof delta === "number" ? delta : undefined;
  const tone =
    node.tone ??
    (numeric === undefined
      ? "accent"
      : numeric > 0
        ? "success"
        : numeric < 0
          ? "danger"
          : "muted");
  const deltaText =
    numeric === undefined
      ? delta === null || delta === undefined || delta === ""
        ? ""
        : String(delta)
      : `${numeric > 0 ? "+" : numeric < 0 ? "−" : ""}${Math.abs(numeric).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
  return (
    <article className="ru-stat" data-tone={tone}>
      <header>
        {Icon && (
          <span className="ru-stat-icon" aria-hidden="true">
            <Icon size={16} strokeWidth={1.8} />
          </span>
        )}
        <span className="ru-stat-label">{node.label}</span>
      </header>
      <p className="ru-stat-value">{formatValue(value)}</p>
      {(deltaText || node.deltaLabel) && (
        <p className="ru-stat-delta">
          {deltaText && <span data-tone={tone}>{deltaText}</span>}
          {node.deltaLabel && <span>{node.deltaLabel}</span>}
        </p>
      )}
      {node.hint && <p className="ru-stat-hint">{node.hint}</p>}
    </article>
  );
}

export function Progress({
  node,
  value,
}: {
  node: ProgressNode;
  value: Scalar;
}) {
  const max = node.max ?? 100;
  const raw = typeof value === "number" && Number.isFinite(value) ? value : 0;
  const clamped = Math.min(max, Math.max(0, raw));
  const percent = Math.round((clamped / max) * 100);
  return (
    <div className="ru-progress" data-tone={node.tone ?? "accent"}>
      {(node.label || node.showValue !== false) && (
        <p className="ru-progress-head">
          <span>{node.label}</span>
          {node.showValue !== false && <output>{percent}%</output>}
        </p>
      )}
      <div
        className="ru-progress-track"
        role="progressbar"
        aria-label={node.label ?? "Progress"}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={clamped}
        aria-valuetext={`${percent}%`}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function Status({ node }: { node: StatusNode }) {
  return (
    <span className="ru-status-pill" data-tone={node.tone ?? "muted"}>
      <i aria-hidden="true" />
      {node.label}
    </span>
  );
}

/** Ordered flow. A real graph editor is out of scope; this covers processes and architectures. */
export function Diagram({
  node,
  caption,
}: {
  node: DiagramNode;
  caption?: string;
}) {
  const direction = node.direction ?? "horizontal";
  const vertical = direction === "vertical";
  return (
    <figure className="ru-diagram" data-direction={direction}>
      <ol>
        {node.steps.map((step, index) => (
          <li
            key={step.id}
            data-depth={step.depth ?? 0}
            data-tone={step.tone ?? "default"}
          >
            {index > 0 &&
              (vertical ? (
                <span className="ru-diagram-edge" aria-hidden="true">
                  <ArrowRight size={14} />
                  {step.connector && <em>{step.connector}</em>}
                </span>
              ) : (
                <span className="ru-diagram-link" aria-hidden="true">
                  {step.connector && <em>{step.connector}</em>}
                  <ArrowRight size={15} />
                </span>
              ))}
            <div className="ru-diagram-card">
              <span className="ru-diagram-index">{index + 1}</span>
              <strong>{step.label}</strong>
              {step.detail && <span>{step.detail}</span>}
            </div>
          </li>
        ))}
      </ol>
      {(caption ?? node.caption) && (
        <figcaption>{caption ?? node.caption}</figcaption>
      )}
    </figure>
  );
}
