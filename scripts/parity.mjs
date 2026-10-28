// Measure rendered geometry and computed styles of the reference-driven renderer.
// Evidence for parity review: same viewport, same fixture content, machine-readable.
// Writes .cache/parity/measurements.json (never committed).
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const out = ".cache/parity";
await mkdir(out, { recursive: true });
const viewports = [
  ["desktop", 1440, 1000],
  ["mobile", 390, 844],
];
const demos = ["technical", "films", "calculator", "configurator"];
const browser = await chromium.launch();
const report = {};

for (const [name, width, height] of viewports) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  for (const demo of demos) {
    for (const theme of ["light", "dark"]) {
      await page.goto(`http://127.0.0.1:4173/?demo=${demo}&theme=${theme}`, {
        waitUntil: "networkidle",
      });
      report[`${name}/${demo}/${theme}`] = await page.evaluate(() => {
        const round = (n) => Math.round(n * 100) / 100;
        const box = (el) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return {
            x: round(r.x),
            y: round(r.y),
            width: round(r.width),
            height: round(r.height),
          };
        };
        const style = (el, props) => {
          if (!el) return null;
          const cs = getComputedStyle(el);
          return Object.fromEntries(
            props.map((p) => [p, cs.getPropertyValue(p)]),
          );
        };
        const first = (selector) => document.querySelector(selector);
        const answer = first(".lab-answer");
        const h2 = first(".rich-ui h2");
        const body = first(".ru-text");
        const card = first(".ru-card");
        const row = first(".ru-row");
        const icon = first(".ru-row svg");
        const code = first(".rich-ui code");
        return {
          viewport: { width: innerWidth, height: innerHeight },
          pageScrollWidth: document.documentElement.scrollWidth,
          answer: box(answer),
          heading: {
            box: box(h2),
            style: style(h2, [
              "font-size",
              "font-weight",
              "line-height",
              "letter-spacing",
              "color",
            ]),
          },
          body: {
            box: box(body),
            style: style(body, ["font-size", "line-height", "color"]),
          },
          card: {
            box: box(card),
            style: style(card, [
              "padding",
              "border-radius",
              "border-width",
              "border-color",
              "background-color",
              "box-shadow",
            ]),
          },
          row: { box: box(row), style: style(row, ["gap", "display"]) },
          icon: {
            box: box(icon),
            style: style(icon, ["color", "width", "height", "stroke-width"]),
          },
          inlineCode: style(code, [
            "font-size",
            "background-color",
            "border-radius",
            "padding",
          ]),
          counts: {
            cards: document.querySelectorAll(".ru-card").length,
            icons: document.querySelectorAll(".ru-row svg").length,
            entities: document.querySelectorAll(".ru-entity-card").length,
            controls: document.querySelectorAll("input,select,button").length,
          },
        };
      });
    }
  }
  await context.close();
}
await browser.close();
await writeFile(`${out}/measurements.json`, JSON.stringify(report, null, 2));
console.log(
  `measured ${Object.keys(report).length} state combinations -> ${out}/measurements.json`,
);
