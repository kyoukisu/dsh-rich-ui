import React, { useState, useRef, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  X,
  BookOpen,
  Film,
  MapPin,
  ExternalLink,
  Check,
  Copy,
  Info,
  ShieldCheck,
  Clock,
  Lock,
  CircleX,
  Zap,
  Search,
  ImageOff,
} from "lucide-react";
import {
  parseRichSpec,
  type RichSpec,
  type RichNode,
  type RichAction,
  type Scalar,
  type Entity,
  type Expr,
} from "../core/schema";
import { evaluate, getInitialState } from "../core/evaluator";
import {
  loadPersistedState,
  savePersistedState,
  clearPersistedState,
} from "./persistence";
import { Popover, Tooltip, ImageLightbox } from "./primitives";
import "./rich-ui.css";
const glyphs: Record<string, React.ComponentType<any>> = {
  clock: Clock,
  lock: Lock,
  error: CircleX,
  x: X,
  check: Check,
  info: Info,
  shield: ShieldCheck,
  "shield-check": ShieldCheck,
  zap: Zap,
  search: Search,
  film: Film,
  book: BookOpen,
  "map-pin": MapPin,
};
function Inline({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/(`[^`]+`|\*\*[^*]+\*\*)/g)
        .map((p, i) =>
          p.startsWith("`") ? (
            <code key={i}>{p.slice(1, -1)}</code>
          ) : p.startsWith("**") ? (
            <strong key={i}>{p.slice(2, -2)}</strong>
          ) : (
            p
          ),
        )}
    </>
  );
}
function Picture({
  src,
  alt,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [failedSrc, setFailedSrc] = useState<string>();
  return failedSrc === src ? (
    <div
      className={`ru-image-fallback ${props.className ?? ""}`}
      role="img"
      aria-label={alt}
    >
      <ImageOff size={24} />
      <span>Изображение недоступно</span>
    </div>
  ) : (
    <img
      {...props}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailedSrc(src)}
    />
  );
}
function Chart({
  node,
  state,
}: {
  node: Extract<RichNode, { type: "chart" }>;
  state: Record<string, Scalar>;
}) {
  let values: number[];
  try {
    values = node.data.map((d) => Number(evaluate(d.value, state)) || 0);
  } catch {
    return (
      <p role="alert" className="ru-evaluation-error">
        Не удалось вычислить график.
      </p>
    );
  }
  const max = Math.max(1, ...values.map(Math.abs));
  const sum = values.reduce((a, b) => a + Math.max(0, b), 0);
  let offset = 0;
  const colors = ["#23836a", "#477cd4", "#ae77b1", "#d29a45"];
  return (
    <figure className="ru-chart">
      <svg
        viewBox="0 0 640 220"
        role="img"
        aria-label={
          node.kind === "line"
            ? "Линейный график"
            : node.kind === "bar"
              ? "Столбчатый график"
              : "Круговая диаграмма"
        }
      >
        {node.kind === "donut" ? (
          values.map((v, i) => {
            const length = sum ? (Math.max(0, v) / sum) * 100 : 0;
            const old = offset;
            offset += length;
            return (
              <circle
                key={i}
                cx="320"
                cy="105"
                r="73"
                fill="none"
                stroke={colors[i % colors.length]}
                strokeWidth="28"
                pathLength="100"
                strokeDasharray={`${length} ${100 - length}`}
                strokeDashoffset={-old}
                transform="rotate(-90 320 105)"
              >
                <title>
                  {node.data[i].label}: {v}
                </title>
              </circle>
            );
          })
        ) : (
          <>
            {[0, 1, 2, 3].map((i) => (
              <g key={i}>
                <line
                  x1="42"
                  y1={20 + i * 48}
                  x2="620"
                  y2={20 + i * 48}
                  stroke="var(--ru-border)"
                />
                <text
                  x="32"
                  y={24 + i * 48}
                  textAnchor="end"
                  className="ru-axis"
                >
                  {Math.round(max * (1 - i / 3))}
                </text>
              </g>
            ))}
            {node.kind === "line" ? (
              <>
                <path
                  d={`M ${values.map((v, i) => `${55 + (i * 550) / Math.max(1, values.length - 1)},${164 - (v / max) * 144}`).join(" L ")}`}
                  fill="none"
                  stroke="var(--ru-accent)"
                  strokeWidth="3"
                />
                {values.map((v, i) => (
                  <circle
                    key={i}
                    cx={55 + (i * 550) / Math.max(1, values.length - 1)}
                    cy={164 - (v / max) * 144}
                    r="4"
                    fill="var(--ru-accent)"
                  >
                    <title>
                      {node.data[i].label}: {v}
                    </title>
                  </circle>
                ))}
              </>
            ) : (
              values.map((v, i) => (
                <rect
                  key={i}
                  x={55 + (i * 550) / Math.max(1, values.length)}
                  y={164 - (Math.max(0, v) / max) * 144}
                  width={Math.min(50, 450 / Math.max(1, values.length))}
                  height={(Math.max(0, v) / max) * 144}
                  rx="4"
                  fill="var(--ru-accent)"
                >
                  <title>
                    {node.data[i].label}: {v}
                  </title>
                </rect>
              ))
            )}
          </>
        )}
      </svg>
      <figcaption>
        {node.data.map((d, i) => (
          <span key={i}>
            <i
              style={{
                background:
                  node.kind === "donut"
                    ? colors[i % colors.length]
                    : "var(--ru-accent)",
              }}
            />
            {d.label} <strong>{values[i].toLocaleString("ru-RU")}</strong>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
export interface RichResponseProps {
  spec: RichSpec;
  /** Opt-in sessionStorage identity; include owning session and response/block. Inputs never persist. */ persistenceKey?: string;
  /** Desktop defaults to non-modal fixed drawer; host owns surrounding layout reflow. Mobile uses a modal sheet. */ detailMode?:
    "drawer" | "modal";
  onAction?: (action: string, payload?: Record<string, unknown>) => void;
}
export function RichResponse({
  spec: raw,
  onAction,
  persistenceKey,
  detailMode = "drawer",
}: RichResponseProps) {
  const spec = React.useMemo(() => parseRichSpec(raw), [raw]);
  const [state, setState] = useState<Record<string, Scalar>>(() =>
    loadPersistedState(spec, persistenceKey),
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const uid = useId();
  const root = useRef<HTMLElement>(null);
  const closePanel = React.useCallback(() => setSelected(null), []);
  const update = (key: string, value: Scalar) => {
    const next = { ...state, [key]: value };
    setState(next);
    savePersistedState(spec, persistenceKey, next);
  };
  useEffect(() => {
    setState(loadPersistedState(spec, persistenceKey));
    setSelected(null);
  }, [spec, persistenceKey]);
  const ev = (expr: Expr) => evaluate(expr, state);
  const act = async (a: RichAction) => {
    try {
      switch (a.type) {
        case "set":
          update(a.key, ev(a.value));
          break;
        case "toggle":
          update(a.key, !state[a.key]);
          break;
        case "reset":
          setState(getInitialState(spec));
          clearPersistedState(persistenceKey);
          break;
        case "open-entity":
          setSelected(a.entityId);
          break;
        case "close-entity":
          setSelected(null);
          break;
        case "copy":
          try {
            await navigator.clipboard.writeText(String(ev(a.text)));
            setNotice("Скопировано");
          } catch {
            setNotice("Не удалось скопировать");
          }
          break;
        case "open-url":
          window.open(a.url, "_blank", "noopener,noreferrer");
          break;
        case "send-message":
          if (onAction) onAction("send-message", { text: String(ev(a.text)) });
          break;
      }
    } catch {
      setNotice("Не удалось выполнить действие: ошибка вычисления.");
    }
  };
  const render = (n: RichNode, i: number | string): React.ReactNode => {
    const key = n.id ?? i;
    try {
      switch (n.type) {
        case "popover":
          return (
            <Popover key={key} label={n.label}>
              {n.children.map(render)}
            </Popover>
          );
        case "tooltip":
          return (
            <Tooltip key={key} text={n.text}>
              <button type="button" className="ru-primitive-trigger">
                {n.label}
              </button>
            </Tooltip>
          );
        case "image-group":
          return (
            <ImageLightbox key={key} src={n.src} alt={n.alt} label={n.label} />
          );
        case "text":
          return (
            <div key={key} className={`ru-text ru-${n.variant ?? "body"}`}>
              <Inline text={String(ev(n.content) ?? "")} />
            </div>
          );
        case "row":
        case "stack":
        case "grid":
        case "card":
          return (
            <div
              key={key}
              className={`ru-${n.type}`}
              style={
                {
                  gap: n.gap,
                  ...(n.type === "grid"
                    ? { "--ru-columns": n.columns ?? 2 }
                    : {}),
                } as React.CSSProperties
              }
            >
              {n.title && <h3>{n.title}</h3>}
              {n.children.map(render)}
            </div>
          );
        case "icon": {
          const Glyph = glyphs[n.name.toLowerCase()] ?? Info;
          return (
            <span
              key={key}
              className="ru-icon"
              data-tone={n.tone ?? "default"}
              aria-hidden="true"
            >
              <Glyph size={n.size ?? 19} strokeWidth={1.7} />
            </span>
          );
        }
        case "entity-list":
          return (
            <EntityRows
              key={key}
              node={n}
              entities={spec.entities ?? []}
              onOpen={setSelected}
            />
          );
        case "divider":
          return (
            <div key={key} className="ru-divider">
              {n.label && <span>{n.label}</span>}
            </div>
          );
        case "callout":
          return (
            <aside key={key} className={`ru-callout ru-${n.tone ?? "info"}`}>
              <Info size={18} />
              <div>
                <Inline text={String(ev(n.content) ?? "")} />
              </div>
            </aside>
          );
        case "computed":
          return (
            <div key={key} className="ru-computed">
              {n.label && <span>{n.label}</span>}
              <output>
                {typeof ev(n.expr) === "number"
                  ? Number(ev(n.expr)).toLocaleString("ru-RU")
                  : String(ev(n.expr) ?? "")}
              </output>
            </div>
          );
        case "button":
          return (
            <button
              key={key}
              className={`ru-button ru-button-${n.variant ?? "secondary"}`}
              disabled={
                Boolean(n.disabled && ev(n.disabled)) ||
                (n.action.type === "send-message" && !onAction)
              }
              onClick={() => void act(n.action)}
            >
              {n.label}
              {n.action.type === "open-url" && <ArrowUpRight size={15} />}
            </button>
          );
        case "input":
          return (
            <label key={key} className="ru-field">
              <span>{n.label}</span>
              <input
                aria-label={n.label ?? n.stateKey}
                type={n.inputType ?? "text"}
                value={String(state[n.stateKey] ?? "")}
                placeholder={n.placeholder}
                onChange={(e) =>
                  update(
                    n.stateKey,
                    n.inputType === "number"
                      ? e.target.value === ""
                        ? ""
                        : Number(e.target.value)
                      : e.target.value,
                  )
                }
              />
            </label>
          );
        case "select":
          return (
            <label key={key} className="ru-field">
              <span>{n.label}</span>
              <select
                aria-label={n.label ?? n.stateKey}
                value={n.options.findIndex(
                  (o) => o.value === state[n.stateKey],
                )}
                onChange={(e) =>
                  update(
                    n.stateKey,
                    n.options[Number(e.target.value)]?.value ?? null,
                  )
                }
              >
                {n.options.map((o, i) => (
                  <option key={i} value={i}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          );
        case "slider":
          return (
            <label key={key} className="ru-field ru-slider">
              <span>
                {n.label}
                <output>
                  {Number(state[n.stateKey] ?? n.min).toLocaleString("ru-RU")}
                </output>
              </span>
              <input
                aria-label={n.label ?? n.stateKey}
                type="range"
                min={n.min}
                max={n.max}
                step={n.step ?? 1}
                value={Number(state[n.stateKey] ?? n.min)}
                onChange={(e) => update(n.stateKey, Number(e.target.value))}
              />
            </label>
          );
        case "switch":
          return (
            <label key={key} className="ru-switch">
              <span>{n.label}</span>
              <input
                aria-label={n.label ?? n.stateKey}
                type="checkbox"
                role="switch"
                checked={Boolean(state[n.stateKey])}
                onChange={(e) => update(n.stateKey, e.target.checked)}
              />
            </label>
          );
        case "checkbox":
          return (
            <label key={key} className="ru-checkbox">
              <input
                type="checkbox"
                checked={Boolean(state[n.stateKey])}
                onChange={(e) => update(n.stateKey, e.target.checked)}
              />
              <span>{n.label}</span>
            </label>
          );
        case "radio":
        case "segmented": {
          const current = state[n.stateKey];
          const name = `${uid}-${n.stateKey}`;
          return (
            <fieldset
              key={key}
              className={`ru-choice ru-${n.type}`}
              aria-label={n.label}
            >
              {n.label && <legend>{n.label}</legend>}
              <div className="ru-choice-options">
                {n.options.map((option, i) => (
                  <label key={i}>
                    <input
                      type="radio"
                      name={name}
                      value={i}
                      checked={current === option.value}
                      onChange={() => update(n.stateKey, option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          );
        }
        case "conditional":
          return (
            <React.Fragment key={key}>
              {(ev(n.when) ? n.children : (n.elseChildren ?? [])).map(render)}
            </React.Fragment>
          );
        case "tabs": {
          const current = String(state[n.stateKey] ?? n.tabs[0]?.id);
          return (
            <div key={key}>
              <div className="ru-tabs" role="tablist">
                {n.tabs.map((t, j) => (
                  <button
                    key={t.id}
                    id={`${uid}-${n.stateKey}-${t.id}`}
                    role="tab"
                    aria-selected={current === t.id}
                    aria-controls={`${uid}-${n.stateKey}-panel`}
                    tabIndex={current === t.id ? 0 : -1}
                    onClick={() => update(n.stateKey, t.id)}
                    onKeyDown={(e) => {
                      if (
                        ["ArrowRight", "ArrowLeft", "Home", "End"].includes(
                          e.key,
                        )
                      ) {
                        e.preventDefault();
                        const next =
                          e.key === "Home"
                            ? 0
                            : e.key === "End"
                              ? n.tabs.length - 1
                              : (j +
                                  (e.key === "ArrowRight" ? 1 : -1) +
                                  n.tabs.length) %
                                n.tabs.length;
                        update(n.stateKey, n.tabs[next].id);
                        (
                          e.currentTarget.parentElement?.children[
                            next
                          ] as HTMLElement
                        )?.focus();
                      }
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div
                role="tabpanel"
                id={`${uid}-${n.stateKey}-panel`}
                aria-labelledby={`${uid}-${n.stateKey}-${current}`}
                className="ru-tabpanel"
              >
                {n.tabs.find((t) => t.id === current)?.children.map(render)}
              </div>
            </div>
          );
        }
        case "table":
          return (
            <div key={key} className="ru-table-wrap">
              <table>
                <thead>
                  <tr>
                    {n.columns.map((c) => (
                      <th key={c.key}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {n.rows.map((r, j) => (
                    <tr key={j}>
                      {n.columns.map((c) => (
                        <td key={c.key}>
                          {String(ev(r[c.key] ?? null) ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        case "chart":
          return <Chart key={key} node={n} state={state} />;
        case "code":
          return (
            <pre key={key} className="ru-code">
              <code>{n.code}</code>
            </pre>
          );
        case "image":
          return (
            <figure key={key} className="ru-image">
              <Picture src={n.src} alt={n.alt} />
              {n.caption && <figcaption>{n.caption}</figcaption>}
            </figure>
          );
        case "carousel":
          return <Carousel key={key}>{n.children.map(render)}</Carousel>;
        case "entity-ref": {
          const entity = spec.entities?.find((e) => e.id === n.entityId);
          if (!entity) return null;
          return (
            <button
              key={key}
              className="ru-entity-card"
              onClick={() => setSelected(entity.id)}
              aria-label={`Подробнее: ${entity.title}`}
            >
              {entity.image && (
                <Picture src={entity.image} alt="" className="ru-poster" />
              )}
              <span className="ru-entity-meta">
                <span className="ru-eyebrow">{entity.kind}</span>
                <strong>{entity.title}</strong>
                <span>{entity.subtitle}</span>
                <span className="ru-entity-description">
                  {entity.description}
                </span>
                <span className="ru-entity-open">
                  Подробнее <ArrowUpRight size={14} />
                </span>
              </span>
            </button>
          );
        }
      }
    } catch {
      return (
        <p key={key} role="alert" className="ru-evaluation-error">
          Не удалось вычислить блок.
        </p>
      );
    }
  };
  const entity = spec.entities?.find((e) => e.id === selected);
  return (
    <section
      ref={root}
      className={`rich-ui${entity ? " ru-has-detail" : ""}`}
      data-detail-mode={detailMode}
      aria-label={spec.title ?? "Интерактивный ответ"}
    >
      {spec.title && <h2>{spec.title}</h2>}
      <div className="ru-response-body">{spec.nodes.map(render)}</div>
      <span role="status" className="ru-status">
        {notice}
      </span>
      {entity && (
        <EntityPanel
          entity={entity}
          entities={spec.entities ?? []}
          onClose={closePanel}
          onSelect={setSelected}
          themeSource={root}
          detailMode={detailMode}
        />
      )}
    </section>
  );
}
/** Full-width entity rows: compact poster, metadata, chevron. Mirrors the reference layout. */
function EntityRows({
  node,
  entities: pool,
  onOpen,
}: {
  node: Extract<RichNode, { type: "entity-list" }>;
  entities: Entity[];
  onOpen: (id: string) => void;
}) {
  const entities = node.entityIds
    .map((id) => pool.find((e) => e.id === id))
    .filter((e): e is Entity => Boolean(e));
  if (entities.length === 0) return null;
  return (
    <ul className="ru-entity-rows">
      {entities.map((entity) => (
        <li key={entity.id}>
          <button
            className="ru-entity-row"
            onClick={() => onOpen(entity.id)}
            aria-label={`Подробнее: ${entity.title}`}
          >
            {entity.image && (
              <Picture src={entity.image} alt="" className="ru-poster-thumb" />
            )}
            <span className="ru-entity-row-meta">
              <span className="ru-eyebrow">{entity.kind}</span>
              <strong>{entity.title}</strong>
              {entity.subtitle && <span>{entity.subtitle}</span>}
              {entity.description && (
                <span className="ru-entity-row-description">
                  {entity.description}
                </span>
              )}
            </span>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function Carousel({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className="ru-carousel">
      <div className="ru-carousel-controls">
        <button
          aria-label="Предыдущие карточки"
          onClick={() =>
            ref.current?.scrollBy({ left: -330, behavior: "smooth" })
          }
        >
          <ChevronLeft size={17} />
        </button>
        <button
          aria-label="Следующие карточки"
          onClick={() =>
            ref.current?.scrollBy({ left: 330, behavior: "smooth" })
          }
        >
          <ChevronRight size={17} />
        </button>
      </div>
      <div
        ref={ref}
        className="ru-carousel-track"
        tabIndex={0}
        aria-label="Подборка карточек"
      >
        {children}
      </div>
    </div>
  );
}
function EntityPanel({
  entity,
  entities,
  onClose,
  onSelect,
  themeSource,
  detailMode,
}: {
  entity: Entity;
  entities: Entity[];
  onClose: () => void;
  onSelect: (id: string) => void;
  themeSource: React.RefObject<HTMLElement>;
  detailMode: "drawer" | "modal";
}) {
  const ref = useRef<HTMLElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [photo, setPhoto] = useState(0);
  const [mobile, setMobile] = useState(
    () =>
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 600px)").matches,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(max-width: 600px)");
    const change = () => setMobile(query.matches);
    change();
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  const modal = detailMode === "modal" || mobile;
  const title = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [theme, setTheme] = useState<string>();
  useEffect(() => {
    const source = themeSource.current;
    const sync = () =>
      setTheme(
        source?.closest("[data-theme]")?.getAttribute("data-theme") ??
          undefined,
      );
    sync();
    const observer = new MutationObserver(sync);
    if (source) {
      let ancestor: HTMLElement | null = source;
      while (ancestor) {
        observer.observe(ancestor, {
          attributes: true,
          attributeFilter: ["data-theme"],
        });
        ancestor = ancestor.parentElement;
      }
    }
    return () => observer.disconnect();
  }, [themeSource]);
  useEffect(() => {
    setPhoto(0);
  }, [entity.id]);
  React.useLayoutEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const panel = ref.current;
    // A drawer that never takes focus leaves Escape dead: move the caret into
    // the panel without trapping Tab, so the surface is announced and closable.
    if (!modal && panel && !panel.contains(document.activeElement)) {
      heading.current?.focus({ preventScroll: true });
    }
    return () => {
      if (
        !modal &&
        panel?.contains(document.activeElement) &&
        opener?.isConnected
      )
        opener.focus();
    };
  }, [modal]);
  useEffect(() => {
    if (!modal) {
      const listener = (event: KeyboardEvent) => {
        if (
          event.key === "Escape" &&
          ref.current?.contains(document.activeElement)
        ) {
          event.preventDefault();
          onCloseRef.current();
        }
      };
      document.addEventListener("keydown", listener);
      return () => document.removeEventListener("keydown", listener);
    }
    const previous = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    close.current?.focus();
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
      }
      if (e.key === "Tab") {
        const nodes = ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input,select,[tabindex="0"]',
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (!ref.current?.contains(document.activeElement)) {
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", listener);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", listener);
      if (previous?.isConnected) previous.focus();
    };
  }, [modal]);
  const images = entity.images?.length
    ? entity.images
    : entity.image
      ? [entity.image]
      : [];
  return createPortal(
    <div
      className={`rich-ui ru-overlay ${modal ? "ru-modal" : "ru-drawer"}`}
      data-theme={theme}
      onClick={(e) => {
        if (modal && e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        ref={ref}
        className="ru-detail"
        role={modal ? "dialog" : "complementary"}
        aria-modal={modal ? true : undefined}
        aria-labelledby={title}
      >
        <header className="ru-detail-top">
          <span>{entity.kind}</span>
          <button
            ref={close}
            aria-label="Закрыть подробности"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>
        {images.length > 0 && (
          <div className="ru-detail-gallery">
            <Picture
              key={images[photo]}
              src={images[photo]}
              alt={`${entity.title} — изображение ${photo + 1}`}
            />
            {images.length > 1 && (
              <div className="ru-gallery-switch">
                {images.map((_, i) => (
                  <button
                    key={i}
                    aria-label={`Изображение ${i + 1}`}
                    aria-pressed={photo === i}
                    onClick={() => setPhoto(i)}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="ru-detail-body">
          <h2 id={title} ref={heading} tabIndex={-1}>
            {entity.title}
          </h2>
          <p className="ru-muted">{entity.subtitle}</p>
          <p>{entity.description}</p>
          {entity.facts && (
            <dl>
              {entity.facts.map((f) => (
                <div key={f.label}>
                  <dt>{f.label}</dt>
                  <dd>{String(f.value ?? "—")}</dd>
                </div>
              ))}
            </dl>
          )}
          {entity.sources?.length && (
            <section>
              <h3>Источники</h3>
              {entity.sources.map((s) => (
                <a
                  className="ru-source"
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  key={s.url}
                >
                  <ExternalLink size={15} />
                  <span>
                    {s.title}
                    <small>{new URL(s.url).hostname}</small>
                  </span>
                  <ArrowUpRight size={15} />
                </a>
              ))}
            </section>
          )}
          {entity.related?.length && (
            <section>
              <h3>Связанные объекты</h3>
              {entity.related.map((id) => {
                const related = entities.find((e) => e.id === id);
                return (
                  related && (
                    <button
                      className="ru-related"
                      key={id}
                      onClick={() => {
                        close.current?.focus();
                        onSelect(id);
                      }}
                    >
                      {related.title}
                      <ChevronRight size={16} />
                    </button>
                  )
                );
              })}
            </section>
          )}
          <p className="ru-provenance">
            Сведения из указанных источников. Демонстрационные данные не
            являются актуальным предложением.
          </p>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
