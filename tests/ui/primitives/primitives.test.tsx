// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImageLightbox, Popover, Tooltip } from "../../../src/ui/primitives";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement;
let root: Root;
const click = (element: Element) =>
  act(() => element.dispatchEvent(new MouseEvent("click", { bubbles: true })));
const key = (element: Element, value: string, shiftKey = false) =>
  act(() =>
    element.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: value,
        shiftKey,
        bubbles: true,
        cancelable: true,
      }),
    ),
  );
const render = (node: React.ReactNode) => act(() => root.render(node));
beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  // jsdom has no native dialog modality. Verify calls/handlers, not browser inertness.
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    writable: true,
    value: vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    }),
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    writable: true,
    value: vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    }),
  });
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});

describe("Popover", () => {
  it("toggles an associated panel, focuses its first control and restores focus on Escape", () => {
    render(
      <Popover label="Details">
        <button>Inside</button>
      </Popover>,
    );
    const trigger = host.querySelector("button")!;
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    click(trigger);
    const panel = host.querySelector("[role=region]")!;
    expect(trigger.getAttribute("aria-controls")).toBe(panel.id);
    expect(document.activeElement?.textContent).toBe("Inside");
    key(document.activeElement!, "Escape");
    expect(host.querySelector("[role=region]")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
  it("closes on outside pointer, closes on tab-away without stealing focus, and keeps internal clicks open", () => {
    render(
      <>
        <Popover label="Details">
          <button>Inside</button>
        </Popover>
        <button id="outside">Outside</button>
      </>,
    );
    const trigger = host.querySelector("button")!;
    click(trigger);
    click(host.querySelector("[role=region] button")!);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    act(() =>
      host
        .querySelector("#outside")!
        .dispatchEvent(new Event("pointerdown", { bubbles: true })),
    );
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
    click(trigger);
    const outside = host.querySelector<HTMLButtonElement>("#outside")!;
    act(() => outside.focus());
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(outside);
  });
  it("focuses a text-only panel and removes listeners on unmount", () => {
    render(<Popover label="Read">Only text</Popover>);
    click(host.querySelector("button")!);
    expect(document.activeElement).toBe(host.querySelector("[role=region]"));
    render(null);
    act(() =>
      document.dispatchEvent(new Event("pointerdown", { bubbles: true })),
    );
    expect(host.childElementCount).toBe(0);
  });
});

describe("Tooltip", () => {
  it("opens on focus, preserves existing description and dismisses on Escape without moving focus", () => {
    render(
      <Tooltip text="More information">
        <button aria-describedby="existing">Help</button>
      </Tooltip>,
    );
    const child = host.querySelector("button")!;
    act(() => child.focus());
    const tip = host.querySelector("[role=tooltip]")!;
    expect(child.getAttribute("aria-describedby")).toBe(`existing ${tip.id}`);
    key(child, "Escape");
    expect(host.querySelector("[role=tooltip]")).toBeNull();
    expect(document.activeElement).toBe(child);
    expect(child.getAttribute("aria-describedby")).toBe("existing");
    act(() => child.blur());
    act(() => child.focus());
    expect(host.querySelector("[role=tooltip]")).not.toBeNull();
  });
  it("stays open while pointer crosses the child into the tooltip and hides on exit", () => {
    render(
      <Tooltip text="Hover detail">
        <button>Help</button>
      </Tooltip>,
    );
    const wrapper = host.firstElementChild!;
    act(() =>
      wrapper.dispatchEvent(new MouseEvent("mouseover", { bubbles: true })),
    );
    expect(host.querySelector("[role=tooltip]")?.textContent).toBe(
      "Hover detail",
    );
    act(() =>
      wrapper.dispatchEvent(
        new MouseEvent("mouseout", {
          bubbles: true,
          relatedTarget: document.body,
        }),
      ),
    );
    expect(host.querySelector("[role=tooltip]")).toBeNull();
  });
  it("renders tooltip text as text, never arbitrary HTML", () => {
    render(
      <Tooltip text={'<img onerror="bad()">'}>
        <button>Help</button>
      </Tooltip>,
    );
    act(() => host.querySelector("button")!.focus());
    expect(host.querySelector("img")).toBeNull();
    expect(host.querySelector("[role=tooltip]")?.textContent).toContain("<img");
  });
});

describe("ImageLightbox", () => {
  const images = [
    "https://example.org/a.jpg",
    "https://example.org/b.jpg",
    "https://example.org/c.jpg",
  ];
  it("opens a labelled native modal and restores trigger focus on Escape", () => {
    render(<ImageLightbox src={images} alt="Landscape" />);
    const trigger = host.querySelector("button")!;
    click(trigger);
    const dialog = host.querySelector("dialog")!;
    expect(dialog.open).toBe(true);
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledOnce();
    expect(
      host.querySelector(
        `#${dialog.getAttribute("aria-labelledby")!.replace(/:/g, "\\:")}`,
      )?.textContent,
    ).toBe("Landscape");
    expect(document.activeElement?.textContent).toBe("Закрыть галерею");
    key(dialog, "Escape");
    expect(host.querySelector("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
  it("navigates with arrow keys and Home/End and wraps without model requests", () => {
    render(<ImageLightbox src={images} alt="Landscape" initialIndex={1} />);
    click(host.querySelector("button")!);
    const dialog = host.querySelector("dialog")!;
    expect(host.querySelector("img")?.getAttribute("src")).toBe(images[1]);
    key(dialog, "End");
    expect(host.querySelector("img")?.getAttribute("src")).toBe(images[2]);
    key(dialog, "ArrowRight");
    expect(host.querySelector("img")?.getAttribute("src")).toBe(images[0]);
    key(dialog, "ArrowLeft");
    expect(host.querySelector("img")?.getAttribute("src")).toBe(images[2]);
    key(dialog, "Home");
    expect(host.querySelector("img")?.getAttribute("src")).toBe(images[0]);
    click(host.querySelector('[aria-label="Следующее изображение"]')!);
    expect(host.querySelector("[role=status]")?.textContent).toBe("2 / 3");
  });
  it("wraps keyboard focus in both directions and supports native cancel and backdrop close", () => {
    render(<ImageLightbox src={images} alt="Landscape" />);
    const trigger = host.querySelector("button")!;
    click(trigger);
    let dialog = host.querySelector("dialog")!;
    const close = dialog.querySelector("button")!;
    key(close, "Tab", true);
    expect(document.activeElement).toBe(
      dialog.querySelector('[aria-label="Следующее изображение"]'),
    );
    key(document.activeElement!, "Tab");
    expect(document.activeElement).toBe(close);
    act(() =>
      dialog.dispatchEvent(
        new Event("cancel", { bubbles: true, cancelable: true }),
      ),
    );
    expect(host.querySelector("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    click(trigger);
    dialog = host.querySelector("dialog")!;
    act(() =>
      dialog.dispatchEvent(
        new MouseEvent("click", { bubbles: true, clientX: -10, clientY: -10 }),
      ),
    );
    expect(host.querySelector("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
  it("disables an empty gallery, clamps initial index and recovers from failed images", () => {
    render(<ImageLightbox src={[]} alt="Empty" />);
    expect(host.querySelector("button")?.disabled).toBe(true);
    render(<ImageLightbox src={images} alt="Landscape" initialIndex={99} />);
    click(host.querySelector("button")!);
    expect(host.querySelector("img")?.getAttribute("src")).toBe(images[2]);
    act(() => host.querySelector("img")!.dispatchEvent(new Event("error")));
    expect(host.textContent).toContain("Изображение недоступно");
    key(host.querySelector("dialog")!, "Home");
    expect(host.querySelector("img")?.getAttribute("src")).toBe(images[0]);
  });
  it("closes safely when images disappear and cleans up an open modal on unmount", () => {
    render(<ImageLightbox src={images} alt="Landscape" />);
    click(host.querySelector("button")!);
    render(<ImageLightbox src={[]} alt="Empty" />);
    expect(host.querySelector("dialog")).toBeNull();
    render(<ImageLightbox src={images} alt="Landscape" />);
    click(host.querySelector("button")!);
    render(null);
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalledTimes(2);
  });
});
