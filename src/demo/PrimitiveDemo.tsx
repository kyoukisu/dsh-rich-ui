import React from "react";
import { ImageLightbox, Popover, Tooltip } from "../ui/primitives";

const image = (background: string, title: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><rect width="800" height="500" fill="${background}"/><circle cx="400" cy="220" r="110" fill="#ffffff" opacity=".25"/><text x="400" y="410" text-anchor="middle" font-family="sans-serif" font-size="36" fill="white">${title}</text></svg>`)}`;
const images = [
  image("#27495c", "First frame"),
  image("#634f73", "Second frame"),
  image("#46614d", "Third frame"),
];

/** Deterministic browser QA fixture: no external media requests or model actions. */
export function PrimitiveDemo() {
  return (
    <section
      className="rich-ui ru-primitive-demo"
      aria-label="Interactive primitives"
    >
      <h2>Local interactive elements</h2>
      <p>
        Open the controls with a mouse or a keyboard. Escape closes the active
        surface.
      </p>
      <div className="ru-primitive-demo-controls">
        <Popover label="Open settings">
          <label>
            Note title{" "}
            <input aria-label="Note title" defaultValue="Observations" />
          </label>
          <button type="button">Save locally</button>
        </Popover>
        <Tooltip text="The hint appears on hover and on focus">
          <button type="button">Primitives help</button>
        </Tooltip>
        <ImageLightbox
          src={images}
          alt="Practice gallery"
          label="Open the practice gallery"
        />
        <button type="button">Outside button</button>
      </div>
    </section>
  );
}
