import React, { useEffect, useId, useMemo, useState } from "react";
import { evaluate } from "../../core/evaluator";
import type { ChartNode, Scalar } from "../../core/schema";

const COLORS = [
  "var(--ru-chart-1)",
  "var(--ru-chart-2)",
  "var(--ru-chart-3)",
  "var(--ru-chart-4)",
  "var(--ru-chart-5)",
  "var(--ru-chart-6)",
];

/**
 * SVG text scales with the viewBox, so a 680-unit chart squeezed into a phone
 * turns 10px labels into 5px ones. Narrow screens get their own coordinate
 * system instead of a shrunken desktop one.
 */
function useCompact(): boolean {
  const [compact, setCompact] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 600px)").matches,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(max-width: 600px)");
    const change = () => setCompact(query.matches);
    change();
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  return compact;
}

interface Series {
  label: string;
  values: number[];
}

function allValues(series: Series[]): number[] {
  return series.flatMap((s) => s.values).filter((v) => Number.isFinite(v));
}

function ticksFor(min: number, max: number, count = 5) {
  let lo = Math.min(0, min);
  let hi = Math.max(0, max);
  if (hi === lo) hi = lo + 1;
  const raw = (hi - lo) / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normal = raw / magnitude;
  const step =
    (normal <= 1
      ? 1
      : normal <= 2
        ? 2
        : normal <= 2.5
          ? 2.5
          : normal <= 5
            ? 5
            : 10) * magnitude;
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let value = lo; value <= hi + step / 2; value += step)
    ticks.push(Math.round(value * 1e6) / 1e6);
  return { lo, hi, ticks };
}

function compact(value: number): string {
  if (Math.abs(value) < 1000) return String(Math.round(value * 100) / 100);
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function readable(value: number, unit?: string): string {
  const text = value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return unit ? `${text} ${unit}` : text;
}

/** Resolve both the single-series and the multi-series shape into one model. */
function readSeries(
  node: ChartNode,
  state: Readonly<Record<string, Scalar>>,
): { categories: string[]; series: Series[] } {
  if (node.series?.length && node.categories?.length)
    return {
      categories: node.categories,
      series: node.series.map((entry) => ({
        label: entry.label,
        values: entry.values.map(
          (value) => Number(evaluate(value, state)) || 0,
        ),
      })),
    };
  const data = node.data ?? [];
  return {
    categories: data.map((entry) => entry.label),
    series: [
      {
        label: node.kind === "donut" ? "Share" : "Value",
        values: data.map((entry) => Number(evaluate(entry.value, state)) || 0),
      },
    ],
  };
}

export function Chart({
  node,
  state,
}: {
  node: ChartNode;
  state: Record<string, Scalar>;
}) {
  const gradient = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const narrow = useCompact();
  const W = narrow ? 360 : 680;
  const H = narrow ? 236 : 254;
  const M = narrow
    ? { top: 16, right: 12, bottom: 32, left: 44 }
    : { top: 18, right: 18, bottom: 38, left: 62 };
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;
  if (node.kind === "scatter") {
    return <Scatter node={node} narrow={narrow} W={W} H={H} M={M} />;
  }
  let model: { categories: string[]; series: Series[] };
  try {
    model = readSeries(node, state);
  } catch {
    return (
      <p role="alert" className="ru-evaluation-error">
        Could not render the chart.
      </p>
    );
  }
  const { categories, series } = model;
  const values = useMemo(() => allValues(series), [series]);
  const total = series.reduce(
    (sum, entry) =>
      sum +
      entry.values.reduce((inner, value) => inner + Math.max(0, value), 0),
    0,
  );
  const { lo, hi, ticks } = ticksFor(
    Math.min(...values, 0),
    Math.max(...values, 0),
  );
  const span = hi - lo || 1;
  const y = (value: number) => M.top + plotH - ((value - lo) / span) * plotH;
  const slot = plotW / Math.max(1, categories.length);
  const x = (index: number) =>
    node.kind === "bar"
      ? M.left + slot * (index + 0.5)
      : M.left +
        (categories.length === 1
          ? plotW / 2
          : (index * plotW) / (categories.length - 1));
  const multi = series.length > 1;
  const labelEvery = Math.ceil(categories.length / (narrow ? 4 : 9));
  const description = `${
    node.kind === "donut"
      ? "Donut chart"
      : node.kind === "bar"
        ? "Bar chart"
        : node.kind === "area"
          ? "Area chart"
          : "Line chart"
  }: ${categories.length} categories${multi ? `, ${series.length} series` : ""}`;

  if (categories.length === 0)
    return <p className="ru-empty">No data for the chart.</p>;

  return (
    <figure className="ru-chart" aria-label={description}>
      {node.kind !== "donut" && node.unit ? (
        <div className="ru-chart-unit">{node.unit}</div>
      ) : null}
      <div className="ru-chart-canvas">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={description}>
          {node.kind === "donut" ? (
            <Donut
              categories={categories}
              values={series[0]?.values ?? []}
              total={total}
              unit={node.unit}
              centerX={W / 2}
              centerY={H / 2 - 6}
            />
          ) : (
            <>
              {ticks.map((tick) => (
                <g key={tick}>
                  <line
                    x1={M.left}
                    x2={W - M.right}
                    y1={y(tick)}
                    y2={y(tick)}
                    stroke="var(--ru-grid)"
                    strokeWidth="1"
                  />
                  <text
                    x={M.left - 10}
                    y={y(tick) + 3.5}
                    textAnchor="end"
                    className="ru-axis"
                  >
                    {compact(tick)}
                  </text>
                </g>
              ))}
              {categories.map((label, index) =>
                index % labelEvery === 0 ? (
                  <text
                    key={`${label}-${index}`}
                    x={x(index)}
                    y={H - M.bottom + 20}
                    textAnchor="middle"
                    className="ru-axis"
                  >
                    {label.length > (narrow ? 8 : 14)
                      ? `${label.slice(0, narrow ? 7 : 13)}…`
                      : label}
                  </text>
                ) : null,
              )}
              {node.kind === "bar"
                ? categories.map((label, index) => {
                    const groupWidth = slot * 0.66;
                    const barWidth = Math.max(
                      3,
                      groupWidth / Math.max(1, series.length),
                    );
                    return series.map((entry, s) => {
                      const value = entry.values[index] ?? 0;
                      const barHeight = Math.abs(y(value) - y(0));
                      return (
                        <rect
                          key={`${label}-${s}`}
                          x={
                            x(index) -
                            groupWidth / 2 +
                            s * barWidth +
                            (series.length > 1 ? 1 : 0)
                          }
                          y={value >= 0 ? y(value) : y(0)}
                          width={Math.max(
                            2,
                            barWidth - (series.length > 1 ? 2 : 0),
                          )}
                          height={Math.max(0, barHeight)}
                          rx="4"
                          fill={COLORS[s % COLORS.length]}
                          opacity={hover === null || hover === index ? 1 : 0.45}
                        />
                      );
                    });
                  })
                : series.map((entry, s) => {
                    const points = entry.values.map((value, index) => ({
                      px: x(index),
                      py: y(value),
                      value,
                    }));
                    const line = points
                      .map(
                        (point, index) =>
                          `${index === 0 ? "M" : "L"} ${point.px} ${point.py}`,
                      )
                      .join(" ");
                    return (
                      <g key={entry.label}>
                        {node.kind === "area" && (
                          <>
                            <defs>
                              <linearGradient
                                id={`${gradient}-${s}`}
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="0%"
                                  stopColor={COLORS[s % COLORS.length]}
                                  stopOpacity="0.28"
                                />
                                <stop
                                  offset="100%"
                                  stopColor={COLORS[s % COLORS.length]}
                                  stopOpacity="0"
                                />
                              </linearGradient>
                            </defs>
                            <path
                              d={`${line} L ${points[points.length - 1]?.px ?? M.left} ${y(lo)} L ${points[0]?.px ?? M.left} ${y(lo)} Z`}
                              fill={`url(#${gradient}-${s})`}
                            />
                          </>
                        )}
                        <path
                          d={line}
                          fill="none"
                          stroke={COLORS[s % COLORS.length]}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {points.map((point, index) => (
                          <circle
                            key={index}
                            cx={point.px}
                            cy={point.py}
                            r={hover === index ? 5.5 : 4}
                            fill="var(--ru-bg)"
                            stroke={COLORS[s % COLORS.length]}
                            strokeWidth="2.5"
                          />
                        ))}
                      </g>
                    );
                  })}
              {categories.map((label, index) => (
                <rect
                  key={`hit-${label}-${index}`}
                  x={M.left + slot * index}
                  y={M.top}
                  width={slot}
                  height={plotH}
                  fill="transparent"
                  tabIndex={0}
                  role="img"
                  aria-label={`${label}: ${series
                    .map(
                      (entry) =>
                        `${entry.label} ${readable(entry.values[index] ?? 0, node.unit)}`,
                    )
                    .join(", ")}`}
                  onPointerEnter={() => setHover(index)}
                  onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover(index)}
                  onBlur={() => setHover(null)}
                  className="ru-chart-hit"
                />
              ))}
            </>
          )}
        </svg>
        {hover !== null && node.kind !== "donut" && (
          <div
            className="ru-chart-tip"
            style={{
              left: `${Math.min(86, Math.max(14, (x(hover) / W) * 100))}%`,
            }}
          >
            <strong>{categories[hover]}</strong>
            {series.map((entry) => (
              <span key={entry.label}>
                <i
                  style={{
                    background: COLORS[series.indexOf(entry) % COLORS.length],
                  }}
                />
                {multi ? `${entry.label}: ` : ""}
                {readable(entry.values[hover] ?? 0, node.unit)}
              </span>
            ))}
          </div>
        )}
      </div>
      <figcaption>
        {node.kind === "donut"
          ? categories.map((label, index) => (
              <span key={label}>
                <i style={{ background: COLORS[index % COLORS.length] }} />
                {label}
                <strong>
                  {readable(series[0]?.values[index] ?? 0, node.unit)}
                  {total > 0
                    ? ` · ${Math.round(((series[0]?.values[index] ?? 0) / total) * 100)}%`
                    : ""}
                </strong>
              </span>
            ))
          : multi
            ? series.map((entry, index) => (
                <span key={entry.label}>
                  <i style={{ background: COLORS[index % COLORS.length] }} />
                  {entry.label}
                </span>
              ))
            : null}
        {node.caption && <p className="ru-chart-caption">{node.caption}</p>}
      </figcaption>
      <div className="ru-sr-only">
        <table>
          <caption>{description}</caption>
          <thead>
            <tr>
              <th>Category</th>
              {series.map((entry) => (
                <th key={entry.label}>{entry.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((label, index) => (
              <tr key={label}>
                <th>{label}</th>
                {series.map((entry) => (
                  <td key={entry.label}>{entry.values[index] ?? 0}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

function Donut({
  categories,
  values,
  total,
  unit,
  centerX,
  centerY,
}: {
  categories: string[];
  values: number[];
  total: number;
  unit?: string;
  centerX: number;
  centerY: number;
}) {
  const radius = 74;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const summary = total > 0 ? total : 1;
  return (
    <g transform={`translate(${centerX} ${centerY})`}>
      <circle r={radius} fill="none" stroke="var(--ru-grid)" strokeWidth="26" />
      {values.map((value, index) => {
        const share = Math.max(0, value) / summary;
        const dash = share * circumference;
        const element = (
          <circle
            key={categories[index] ?? index}
            r={radius}
            fill="none"
            stroke={COLORS[index % COLORS.length]}
            strokeWidth="26"
            strokeDasharray={`${Math.max(0, dash - 2)} ${circumference}`}
            strokeDashoffset={-offset}
            transform="rotate(-90)"
            strokeLinecap="butt"
          />
        );
        offset += dash;
        return element;
      })}
      <text
        textAnchor="middle"
        y="-2"
        className="ru-donut-value"
        fill="var(--ru-ink)"
      >
        {total.toLocaleString("en-US", { maximumFractionDigits: 1 })}
      </text>
      <text textAnchor="middle" y="20" className="ru-axis">
        {unit ?? "total"}
      </text>
    </g>
  );
}

/** Scatter: raw numeric points on two axes, one series, no category slots. */
function Scatter({
  node,
  narrow,
  W,
  H,
  M,
}: {
  node: ChartNode;
  narrow: boolean;
  W: number;
  H: number;
  M: { top: number; right: number; bottom: number; left: number };
}) {
  const points = node.points ?? [];
  const [hover, setHover] = useState<number | null>(null);
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  let xLo = Math.min(...xs);
  let xHi = Math.max(...xs);
  let yLo = Math.min(...ys);
  let yHi = Math.max(...ys);
  if (xHi - xLo === 0) {
    xLo -= 1;
    xHi += 1;
  }
  if (yHi - yLo === 0) {
    yLo -= 1;
    yHi += 1;
  }
  const xPad = (xHi - xLo) * 0.05;
  const yPad = (yHi - yLo) * 0.08;
  xLo -= xPad;
  xHi += xPad;
  yLo -= yPad;
  yHi += yPad;
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;
  const sx = (value: number) => M.left + ((value - xLo) / (xHi - xLo)) * plotW;
  const sy = (value: number) => M.top + plotH - ((value - yLo) / (yHi - yLo)) * plotH;
  const xTicks = niceTicks(xLo, xHi);
  const yTicks = niceTicks(yLo, yHi);
  const label = (value: number) => formatTick(value);
  const description = `Scatter chart: ${points.length} points`;
  const active = hover === null ? null : points[hover];
  return (
    <figure className="ru-chart ru-chart-scatter" aria-label={description}>
      {node.unit ? <div className="ru-chart-unit">{node.unit}</div> : null}
      <div className="ru-chart-canvas">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={description}>
          {yTicks.map((tick) => (
            <g key={`y${tick}`}>
              <line
                x1={M.left}
                x2={W - M.right}
                y1={sy(tick)}
                y2={sy(tick)}
                className="ru-grid-line"
              />
              <text
                x={M.left - 10}
                y={sy(tick)}
                dy="0.32em"
                textAnchor="end"
                className="ru-axis"
              >
                {label(tick)}
              </text>
            </g>
          ))}
          {xTicks.map((tick) => (
            <g key={`x${tick}`}>
              <line
                x1={sx(tick)}
                x2={sx(tick)}
                y1={M.top}
                y2={H - M.bottom}
                className="ru-grid-line ru-grid-line-x"
              />
              <text
                x={sx(tick)}
                y={H - M.bottom + 16}
                textAnchor="middle"
                className="ru-axis"
              >
                {label(tick)}
              </text>
            </g>
          ))}
          <line
            x1={M.left}
            x2={W - M.right}
            y1={H - M.bottom}
            y2={H - M.bottom}
            className="ru-axis-line"
          />
          <line
            x1={M.left}
            x2={M.left}
            y1={M.top}
            y2={H - M.bottom}
            className="ru-axis-line"
          />
          {node.xUnit ? (
            <text
              x={W - M.right}
              y={H - M.bottom + 30}
              textAnchor="end"
              className="ru-axis"
            >
              {node.xUnit}
            </text>
          ) : null}
          {points.map((point, index) => (
            <circle
              key={`${point.x}:${point.y}:${index}`}
              cx={sx(point.x)}
              cy={sy(point.y)}
              r={hover === index ? 5.2 : 3.6}
              className="ru-scatter-point"
              onMouseEnter={() => setHover(index)}
              onMouseLeave={() => setHover(null)}
            >
              <title>
                {point.label ? `${point.label}: ` : ""}
                {label(point.x)}
                {node.xUnit ? ` ${node.xUnit}` : ""} · {label(point.y)}
                {node.unit ? ` ${node.unit}` : ""}
              </title>
            </circle>
          ))}
        </svg>
        {active ? (
          <div className="ru-chart-tip" style={{ left: "18%", top: "8%" }}>
            <strong>{active.label ?? "Point"}</strong>
            <span>
              {label(active.x)}
              {node.xUnit ? ` ${node.xUnit}` : ""}
            </span>
            <span>
              {label(active.y)}
              {node.unit ? ` ${node.unit}` : ""}
            </span>
          </div>
        ) : null}
      </div>
      {node.caption ? (
        <figcaption>
          <p className="ru-chart-caption">{node.caption}</p>
        </figcaption>
      ) : null}
      <div className="ru-sr-only">
        <table>
          <caption>{description}</caption>
          <thead>
            <tr>
              <th>{node.xUnit ?? "X"}</th>
              <th>{node.unit ?? "Y"}</th>
              <th>Label</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point, index) => (
              <tr key={`${point.x}:${point.y}:${index}`}>
                <td>{point.x}</td>
                <td>{point.y}</td>
                <td>{point.label ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

/** Round axis steps so labels read 0, 25, 50 instead of 35.52 and 51.76. */
function niceTicks(lo: number, hi: number, count = 5): number[] {
  const span = hi - lo || 1;
  const raw = span / count;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const normalized = raw / magnitude;
  const step =
    (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) *
    magnitude;
  const start = Math.ceil(lo / step) * step;
  const ticks: number[] = [];
  for (let value = start; value <= hi + step * 0.001; value += step) {
    ticks.push(Number(value.toPrecision(12)));
  }
  return ticks;
}

/** Small tick formatter: two decimals at most, grouping above 10k. */
function formatTick(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Math.abs(rounded) >= 10000
    ? rounded.toLocaleString("en-US", { maximumFractionDigits: 2 })
    : String(rounded);
}
