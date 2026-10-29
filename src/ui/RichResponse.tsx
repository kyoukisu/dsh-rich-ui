import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleX,
  Info,
  X,
} from "lucide-react";
import {
  parseRichSpec,
  type Entity,
  type Expr,
  type RichAction,
  type RichNode,
  type RichSpec,
  type Scalar,
} from "../core/schema";
import { evaluate, getInitialState } from "../core/evaluator";
import {
  clearPersistedState,
  loadPersistedState,
  savePersistedState,
} from "./persistence";
import { ImageLightbox, Popover, Tooltip } from "./primitives";
import { Inline } from "./inline";
import { EntityDetails } from "./EntityDetails";
import { Picture } from "./Picture";
import { resolveIcon } from "./icons";
import { Chart } from "./blocks/Chart";
import { CodeBlock } from "./blocks/CodeBlock";
import {
  Diagram,
  Progress,
  Stat,
  Status,
  formatNumber,
} from "./blocks/Metrics";
import { SortableTable } from "./blocks/Table";
import "./rich-ui.css";

const TONE_ICONS = {
  success: CheckCircle2,
  error: CircleX,
  warning: AlertTriangle,
  info: Info,
} as const;

export interface RichResponseProps {
  spec: RichSpec;
  /** Opt-in sessionStorage identity; include owning session and response/block. Inputs never persist. */
  persistenceKey?: string;
  /** Desktop defaults to non-modal fixed drawer; host owns surrounding layout reflow. Mobile uses a modal sheet. */
  detailMode?: "drawer" | "modal";
  /**
   * Preferred entity surface. Return true when the host opened it; false keeps
   * the in-page drawer, so a host without a right sidebar still works.
   */
  onOpenEntity?: (entity: Entity, entities: Entity[]) => boolean;
  onAction?: (action: string, payload?: Record<string, unknown>) => void;
}

export function RichResponse({
  spec: raw,
  onAction,
  onOpenEntity,
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
  const openEntity = React.useCallback(
    (id: string) => {
      const entity = spec.entities?.find((entry) => entry.id === id);
      if (entity && onOpenEntity?.(entity, spec.entities ?? [])) return;
      setSelected(id);
    },
    [spec, onOpenEntity],
  );
  const act = async (action: RichAction) => {
    try {
      switch (action.type) {
        case "set":
          update(action.key, ev(action.value));
          break;
        case "toggle":
          update(action.key, !state[action.key]);
          break;
        case "reset":
          setState(getInitialState(spec));
          clearPersistedState(persistenceKey);
          break;
        case "open-entity":
          openEntity(action.entityId);
          break;
        case "close-entity":
          setSelected(null);
          break;
        case "copy":
          try {
            await navigator.clipboard.writeText(String(ev(action.text)));
            setNotice("Скопировано");
          } catch {
            setNotice("Не удалось скопировать");
          }
          break;
        case "open-url":
          window.open(action.url, "_blank", "noopener,noreferrer");
          break;
        case "send-message":
          if (onAction)
            onAction("send-message", { text: String(ev(action.text)) });
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
              <Inline
                text={String(ev(n.content) ?? "")}
                entities={spec.entities}
                onEntity={openEntity}
              />
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
              {n.title && <h3 className="ru-section-title">{n.title}</h3>}
              {n.children.map(render)}
            </div>
          );
        case "icon": {
          const Glyph = resolveIcon(n.name) ?? Info;
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
        case "stat":
          return (
            <Stat
              key={key}
              node={n}
              value={ev(n.value)}
              delta={n.delta === undefined ? undefined : ev(n.delta)}
            />
          );
        case "progress":
          return <Progress key={key} node={n} value={ev(n.value)} />;
        case "status":
          return <Status key={key} node={n} />;
        case "diagram":
          return <Diagram key={key} node={n} />;
        case "meta":
          return (
            <div key={key} className="ru-meta">
              {n.items.map((item, index) => {
                const Glyph = item.icon ? resolveIcon(item.icon) : undefined;
                return (
                  <span key={index} className="ru-meta-item">
                    {Glyph && (
                      <span className="ru-icon" data-tone="muted">
                        <Glyph size={15} strokeWidth={1.7} />
                      </span>
                    )}
                    {item.text}
                  </span>
                );
              })}
            </div>
          );
        case "entity-list":
          return (
            <EntityRows
              key={key}
              node={n}
              entities={spec.entities ?? []}
              onOpen={openEntity}
            />
          );
        case "divider":
          return (
            <div key={key} className="ru-divider">
              {n.label && <span>{n.label}</span>}
            </div>
          );
        case "callout": {
          const Icon = TONE_ICONS[n.tone ?? "info"];
          return (
            <aside key={key} className={`ru-callout ru-${n.tone ?? "info"}`}>
              <Icon size={18} aria-hidden="true" />
              <div>
                {n.title && (
                  <strong className="ru-callout-title">{n.title}</strong>
                )}
                <Inline
                  text={String(ev(n.content) ?? "")}
                  entities={spec.entities}
                  onEntity={openEntity}
                />
              </div>
            </aside>
          );
        }
        case "computed": {
          const value = ev(n.expr);
          return (
            <div key={key} className="ru-computed">
              {n.label && <span>{n.label}</span>}
              <output>
                {typeof value === "number"
                  ? formatNumber(value)
                  : String(value ?? "")}
              </output>
            </div>
          );
        }
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
                onChange={(event) =>
                  update(
                    n.stateKey,
                    n.inputType === "number"
                      ? event.target.value === ""
                        ? ""
                        : Number(event.target.value)
                      : event.target.value,
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
                  (option) => option.value === state[n.stateKey],
                )}
                onChange={(event) =>
                  update(
                    n.stateKey,
                    n.options[Number(event.target.value)]?.value ?? null,
                  )
                }
              >
                {n.options.map((option, index) => (
                  <option key={index} value={index}>
                    {option.label}
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
                onChange={(event) =>
                  update(n.stateKey, Number(event.target.value))
                }
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
                onChange={(event) => update(n.stateKey, event.target.checked)}
              />
            </label>
          );
        case "checkbox":
          return (
            <label key={key} className="ru-checkbox">
              <input
                type="checkbox"
                checked={Boolean(state[n.stateKey])}
                onChange={(event) => update(n.stateKey, event.target.checked)}
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
                {n.options.map((option, index) => (
                  <label key={index}>
                    <input
                      type="radio"
                      name={name}
                      value={index}
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
                {n.tabs.map((tab, index) => (
                  <button
                    key={tab.id}
                    id={`${uid}-${n.stateKey}-${tab.id}`}
                    role="tab"
                    aria-selected={current === tab.id}
                    aria-controls={`${uid}-${n.stateKey}-panel`}
                    tabIndex={current === tab.id ? 0 : -1}
                    onClick={() => update(n.stateKey, tab.id)}
                    onKeyDown={(event) => {
                      if (
                        !["ArrowRight", "ArrowLeft", "Home", "End"].includes(
                          event.key,
                        )
                      )
                        return;
                      event.preventDefault();
                      const next =
                        event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? n.tabs.length - 1
                            : (index +
                                (event.key === "ArrowRight" ? 1 : -1) +
                                n.tabs.length) %
                              n.tabs.length;
                      update(n.stateKey, n.tabs[next].id);
                      (
                        event.currentTarget.parentElement?.children[
                          next
                        ] as HTMLElement
                      )?.focus();
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div
                role="tabpanel"
                id={`${uid}-${n.stateKey}-panel`}
                aria-labelledby={`${uid}-${n.stateKey}-${current}`}
                className="ru-tabpanel"
              >
                {n.tabs.find((tab) => tab.id === current)?.children.map(render)}
              </div>
            </div>
          );
        }
        case "table":
          return <SortableTable key={key} node={n} state={state} />;
        case "chart":
          return <Chart key={key} node={n} state={state} />;
        case "code":
          return (
            <CodeBlock
              key={key}
              code={n.code}
              language={n.language}
              title={n.title}
              lineNumbers={n.lineNumbers}
            />
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
          const entity = spec.entities?.find(
            (entry) => entry.id === n.entityId,
          );
          if (!entity) return null;
          return (
            <button
              key={key}
              className="ru-entity-card"
              onClick={() => openEntity(entity.id)}
              aria-label={`Подробнее: ${entity.title}`}
            >
              {entity.image && (
                <Picture src={entity.image} alt="" className="ru-poster" />
              )}
              <span className="ru-entity-meta">
                <span className="ru-eyebrow">{entity.kind}</span>
                <strong>{entity.title}</strong>
                {entity.subtitle && <span>{entity.subtitle}</span>}
                {entity.description && (
                  <span className="ru-entity-description">
                    {entity.description}
                  </span>
                )}
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
  const entity = spec.entities?.find((entry) => entry.id === selected);
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
    .map((id) => pool.find((entry) => entry.id === id))
    .filter((entry): entry is Entity => Boolean(entry));
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
              <Picture
                src={entity.image}
                alt=""
                className={`ru-poster-thumb${
                  entity.thumbShape === "square" ? " ru-poster-square" : ""
                }`}
              />
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
              {entity.badge && (
                <span
                  className="ru-entity-badge"
                  data-tone={entity.badge.tone ?? "success"}
                >
                  <Check size={13} aria-hidden="true" />
                  {entity.badge.label}
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
          type="button"
          aria-label="Предыдущие карточки"
          onClick={() =>
            ref.current?.scrollBy({ left: -330, behavior: "smooth" })
          }
        >
          <ChevronLeft size={17} />
        </button>
        <button
          type="button"
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
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      }
      if (event.key === "Tab") {
        const nodes = ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input,select,[tabindex="0"]',
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (!ref.current?.contains(document.activeElement)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
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
  return createPortal(
    <div
      className={`rich-ui ru-overlay ${modal ? "ru-modal" : "ru-drawer"}`}
      data-theme={theme}
      onClick={(event) => {
        if (modal && event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        ref={ref}
        className="ru-detail"
        role={modal ? "dialog" : "complementary"}
        aria-modal={modal ? true : undefined}
        aria-labelledby={title}
      >
        {modal && <span className="ru-sheet-handle" aria-hidden="true" />}
        <header className="ru-detail-top">
          <span className="ru-eyebrow">{entity.kind}</span>
          <button
            ref={close}
            type="button"
            aria-label="Закрыть подробности"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </header>
        <EntityDetails
          entity={entity}
          entities={entities}
          titleId={title}
          titleRef={heading}
          onSelect={(id) => {
            close.current?.focus();
            onSelect(id);
          }}
        />
      </aside>
    </div>,
    document.body,
  );
}
