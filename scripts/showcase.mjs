// Capture review screenshots of the laboratory with real assets (not test mocks).
// Evidence only: written under .cache/showcase, never committed.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const out = ".cache/showcase";
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const shots = [
  [
    "films-desktop",
    "?demo=films&theme=light",
    1440,
    1000,
    async (page) => {
      await page
        .locator('.ru-entity-row[aria-label="Details: Interstellar"]')
        .click();
      await page.waitForTimeout(400);
    },
  ],
  [
    "calculator-desktop",
    "?demo=calculator&theme=light",
    1440,
    1000,
    async () => {},
  ],
  [
    "technical-desktop",
    "?demo=technical&theme=dark",
    1440,
    1000,
    async () => {},
  ],
  [
    "configurator-desktop",
    "?demo=configurator&theme=light",
    1440,
    1000,
    async () => {},
  ],
  [
    "films-mobile",
    "?demo=films&theme=light",
    390,
    844,
    async (page) => {
      await page
        .locator('.ru-entity-row[aria-label="Details: Interstellar"]')
        .click();
      await page.waitForTimeout(400);
    },
  ],
  [
    "primitives-mobile",
    "?demo=primitives&theme=light",
    390,
    844,
    async () => {},
  ],
];
for (const [name, query, width, height, act] of shots) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:4173/${query}`, {
    waitUntil: "networkidle",
  });
  await act(page);
  await page.screenshot({ path: `${out}/${name}.png` });
  await context.close();
  console.log(`${name}: ${width}x${height}`);
}
await browser.close();
