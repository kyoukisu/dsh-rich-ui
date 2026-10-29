import React, {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import "./primitives.css";

const focusable =
  'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export interface PopoverProps {
  label: string;
  children: ReactNode;
}
/** Non-modal disclosure. Content may contain controls; no model/network callbacks. */
export function Popover({ label, children }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const container = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    (
      panel.current?.querySelector<HTMLElement>(focusable) ?? panel.current
    )?.focus();
    const close = () => {
      setOpen(false);
      trigger.current?.focus();
    };
    const pointer = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) close();
    };
    const key = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        container.current?.contains(document.activeElement)
      ) {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
    };
    document.addEventListener("pointerdown", pointer);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", pointer);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  return (
    <span
      className="ru-primitive-popover"
      ref={container}
      onBlur={(event) => {
        if (
          open &&
          event.relatedTarget &&
          !event.currentTarget.contains(event.relatedTarget as Node)
        )
          setOpen(false);
      }}
    >
      <button
        className="ru-primitive-trigger"
        type="button"
        ref={trigger}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
      </button>
      {open && (
        <div
          className="ru-primitive-popover-panel"
          id={id}
          ref={panel}
          tabIndex={-1}
          role="region"
          aria-label={label}
        >
          {children}
        </div>
      )}
    </span>
  );
}

export interface TooltipProps {
  text: string;
  children: ReactElement<{ "aria-describedby"?: string }>;
}
/** Supply a single focusable child (normally a button). Tooltip content is text only. */
export function Tooltip({ text, children }: TooltipProps) {
  const id = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const open = (hovered || focused) && !dismissed;
  useEffect(() => {
    if (!open) return;
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDismissed(true);
        event.stopPropagation();
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open]);
  const describedBy =
    [children.props["aria-describedby"], open ? id : undefined]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <span
      className="ru-primitive-tooltip"
      onMouseEnter={() => {
        setHovered(true);
        if (!focused) setDismissed(false);
      }}
      onMouseLeave={() => {
        setHovered(false);
        if (!focused) setDismissed(false);
      }}
      onFocus={() => {
        setFocused(true);
        if (!hovered) setDismissed(false);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setFocused(false);
          if (!hovered) setDismissed(false);
        }
      }}
    >
      {React.cloneElement(children, { "aria-describedby": describedBy })}
      {open && (
        <span className="ru-primitive-tooltip-text" role="tooltip" id={id}>
          {text}
        </span>
      )}
    </span>
  );
}

export interface ImageLightboxProps {
  src: string[];
  alt: string;
  label?: string;
  initialIndex?: number;
}
/** Caller validates image URLs. Native modal dialog provides background inertness. */
export function ImageLightbox({
  src,
  alt,
  label = "Open gallery",
  initialIndex = 0,
}: ImageLightboxProps) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const current = Math.min(index, Math.max(0, src.length - 1));
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  useEffect(() => {
    setFailed(false);
  }, [current, src[current]]);
  useEffect(() => {
    if (!open) return;
    const node = dialog.current!;
    node.showModal();
    closeButton.current?.focus();
    return () => {
      node.close();
      trigger.current?.focus();
    };
  }, [open]);
  useEffect(() => {
    if (!src.length && open) setOpen(false);
  }, [src.length, open]);
  return (
    <span className="ru-primitive-gallery">
      <button
        className="ru-primitive-trigger"
        type="button"
        ref={trigger}
        disabled={!src.length}
        aria-haspopup="dialog"
        onClick={() => {
          setIndex(
            Number.isFinite(initialIndex)
              ? Math.min(Math.max(0, Math.trunc(initialIndex)), src.length - 1)
              : 0,
          );
          setFailed(false);
          setOpen(true);
        }}
      >
        {label}
      </button>
      {open && (
        <dialog
          className="ru-primitive-lightbox"
          ref={dialog}
          aria-labelledby={titleId}
          onCancel={(event) => {
            event.preventDefault();
            close();
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              const bounds = event.currentTarget.getBoundingClientRect();
              if (
                event.clientX < bounds.left ||
                event.clientX > bounds.right ||
                event.clientY < bounds.top ||
                event.clientY > bounds.bottom
              )
                close();
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              close();
              return;
            }
            if (event.key === "ArrowRight") {
              event.preventDefault();
              setIndex((current + 1) % src.length);
            }
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              setIndex((current - 1 + src.length) % src.length);
            }
            if (event.key === "Home") {
              event.preventDefault();
              setIndex(0);
            }
            if (event.key === "End") {
              event.preventDefault();
              setIndex(src.length - 1);
            }
            if (event.key === "Tab") {
              const controls = Array.from(
                event.currentTarget.querySelectorAll<HTMLElement>(focusable),
              );
              const first = controls[0],
                last = controls[controls.length - 1];
              if (
                event.shiftKey &&
                (document.activeElement === first ||
                  !event.currentTarget.contains(document.activeElement))
              ) {
                event.preventDefault();
                last?.focus();
              } else if (
                !event.shiftKey &&
                (document.activeElement === last ||
                  !event.currentTarget.contains(document.activeElement))
              ) {
                event.preventDefault();
                first?.focus();
              }
            }
          }}
        >
          <div className="ru-primitive-lightbox-header">
            <h2 id={titleId}>{alt}</h2>
            <button type="button" ref={closeButton} onClick={close}>
              Close gallery
            </button>
          </div>
          <div className="ru-primitive-lightbox-image">
            {failed ? (
              <p role="status">Image unavailable</p>
            ) : (
              <img
                key={src[current]}
                src={src[current]}
                alt={alt}
                onError={() => setFailed(true)}
              />
            )}
          </div>
          <div className="ru-primitive-lightbox-controls">
            {src.length > 1 && (
              <button
                type="button"
                aria-label="Previous image"
                onClick={() =>
                  setIndex((current - 1 + src.length) % src.length)
                }
              >
                ←
              </button>
            )}
            <span role="status" aria-live="polite">
              {current + 1} / {src.length}
            </span>
            {src.length > 1 && (
              <button
                type="button"
                aria-label="Next image"
                onClick={() => setIndex((current + 1) % src.length)}
              >
                →
              </button>
            )}
          </div>
        </dialog>
      )}
    </span>
  );
}
