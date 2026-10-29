import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.beforeEach(async ({ page }) => {
  await page.route("https://image.tmdb.org/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 560"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#233443"/><stop offset="1" stop-color="#8c9c9a"/></linearGradient></defs><rect width="400" height="560" fill="url(#g)"/><circle cx="200" cy="210" r="90" fill="#d7d3bd" opacity=".4"/><path d="M0 420 L150 320 250 430 400 290V560H0" fill="#172c39"/></svg>',
    }),
  );
});
test("film detail panel opens, navigates related entity, and restores focus", async ({
  page,
}) => {
  await page.goto("/?demo=films");
  const card = page.locator(
    ".ru-entity-card[aria-label='Details: Interstellar']",
  );
  await card.click();
  const dialog = page.locator(".ru-detail");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "Interstellar", exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Image 2" }).click();
  await expect(
    dialog.getByRole("button", { name: "Image 2" }),
  ).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "Arrival", exact: true }).click();
  await expect(
    dialog.getByRole("heading", { name: "Arrival", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(card).toBeFocused();
});
test("calculator computes immediately and reset restores defaults", async ({
  page,
}) => {
  await page.goto("/?demo=calculator");
  await expect(page.locator(".ru-computed output")).toHaveText(/70,246/);
  const rate = page.getByRole("slider", { name: "Annual return, %" });
  await rate.fill("0");
  await expect(page.locator(".ru-computed output")).toHaveText(/50,000/);
  await page.getByRole("button", { name: "Reset parameters" }).click();
  await expect(rate).toHaveValue("12");
  await expect(page.locator(".ru-computed output")).toHaveText(/70,246/);
});
test("configurator updates text, conditional chart, tabs and notification locally", async ({
  page,
}) => {
  await page.goto("/?demo=configurator");
  await page
    .getByRole("textbox", { name: "Project name" })
    .fill("New system");
  await expect(page.locator(".ru-title")).toHaveText("New system");
  await expect(
    page.getByRole("img", { name: "Line chart" }),
  ).toBeVisible();
  await page.getByRole("switch", { name: "Enable analytics" }).uncheck();
  await expect(page.getByRole("img", { name: "Line chart" })).toHaveCount(
    0,
  );
  await page.getByRole("tab", { name: "Table" }).click();
  await expect(page.getByRole("table")).toBeVisible();
  await page.getByRole("switch", { name: "Show notifications" }).check();
  await expect(
    page.getByText("Notifications are on in the preview."),
  ).toBeVisible();
});
test("all scenarios have no horizontal overflow or runtime errors in both themes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // A viewport shorter than the answer clips an element screenshot under the
  // sticky lab header, so give every scenario the same tall frame.
  await page.setViewportSize({
    width: page.viewportSize()!.width,
    height: 1900,
  });
  for (const demo of [
    "dashboard",
    "technical",
    "films",
    "calculator",
    "configurator",
    "diagnostic",
  ]) {
    for (const theme of ["light", "dark"]) {
      await page.goto(`/?demo=${demo}&theme=${theme}`);
      await expect(page.locator(".rich-ui").first()).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
      await page.evaluate(() => window.scrollTo(0, 0));
      const answer = await page.locator(".lab-answer").boundingBox();
      expect(answer).not.toBeNull();
      await expect(page).toHaveScreenshot(`${demo}-${theme}.png`, {
        clip: answer!,
        animations: "disabled",
        maxDiffPixelRatio: 0.01,
      });
    }
  }
  expect(errors).toEqual([]);
});
test("detail respects mobile modal and desktop nonmodal semantics", async ({
  page,
  isMobile,
}) => {
  await page.goto("/?demo=films");
  await page
    .locator(".ru-entity-card[aria-label='Details: Interstellar']")
    .click();
  if (isMobile) {
    await expect(
      page.getByRole("button", { name: "Close details" }),
    ).toBeFocused();
    await expect(page.getByRole("dialog")).toHaveAttribute(
      "aria-modal",
      "true",
    );
    await page.keyboard.press("Shift+Tab");
    expect(
      await page.evaluate(
        () => !!document.activeElement?.closest("[role=dialog]"),
      ),
    ).toBeTruthy();
  } else {
    await expect(page.locator(".ru-detail")).not.toHaveAttribute(
      "aria-modal",
      "true",
    );
    await expect(
      page.getByRole("button", { name: "Toggle theme" }),
    ).toBeEnabled();
  }
  await page.getByRole("button", { name: "Close details" }).click();
  await expect(page.locator(".ru-detail")).toHaveCount(0);
});
test("renderer passes automated accessibility checks", async ({ page }) => {
  for (const demo of [
    "dashboard",
    "technical",
    "films",
    "calculator",
    "configurator",
    "diagnostic",
  ]) {
    await page.goto(`/?demo=${demo}`);
    const results = await new AxeBuilder({ page })
      .include(".lab-answer")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
});
test("icons carry semantic colour, not one grey tone", async ({ page }) => {
  await page.goto("/?demo=technical&theme=light");
  const colors = await page.$$eval(".ru-icon", (els) =>
    els.map((el) => getComputedStyle(el).color),
  );
  expect(new Set(colors).size).toBeGreaterThanOrEqual(3);
  const danger = await page
    .locator(".ru-icon[data-tone=danger]")
    .first()
    .evaluate((el) => getComputedStyle(el).color);
  const muted = await page
    .locator(".ru-icon[data-tone=muted]")
    .first()
    .evaluate((el) => getComputedStyle(el).color);
  expect(danger).not.toBe(muted);
});
test("entity rows open the same detail panel and keep focus contract", async ({
  page,
}) => {
  await page.goto("/?demo=films");
  const row = page.locator(".ru-entity-row[aria-label='Details: Arrival']");
  await row.click();
  await expect(page.locator(".ru-detail")).toBeVisible();
  await expect(
    page
      .locator(".ru-detail")
      .getByRole("heading", { name: "Arrival", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".ru-detail")).toHaveCount(0);
  await expect(row).toBeFocused();
});

test("sortable table reorders rows without a model call", async ({ page }) => {
  await page.goto("/?demo=dashboard");
  const firstTask = page.locator(".ru-table-wrap tbody tr td").first();
  await expect(firstTask).toHaveText("Design");
  await page.locator("th", { hasText: "Progress" }).locator("button").click();
  await expect(firstTask).toHaveText("Testing");
  await expect(page.locator("th", { hasText: "Progress" })).toHaveAttribute(
    "aria-sort",
    "ascending",
  );
});

test("chart exposes axes, series legend and a hover readout", async ({
  page,
}) => {
  await page.goto("/?demo=dashboard");
  await expect(page.locator(".ru-chart .ru-axis-unit")).toHaveText("$k");
  await expect(page.locator(".ru-chart figcaption")).toContainText("Revenue");
  await page.locator(".ru-chart-hit").nth(3).hover();
  await expect(page.locator(".ru-chart-tip")).toContainText("Apr");
  await expect(page.locator(".ru-chart-tip")).toContainText("91");
});

test("diagram steps keep their order and connector labels", async ({
  page,
}) => {
  await page.goto("/?demo=dashboard");
  const steps = page.locator(".ru-diagram-card strong");
  await expect(steps).toHaveCount(4);
  await expect(steps.first()).toHaveText("Request");
  await expect(page.locator(".ru-diagram-edge").first()).toContainText(
    "interface description",
  );
});

test("table filters rows locally and renders semantic status tones", async ({
  page,
}) => {
  await page.goto("/?demo=dashboard");
  const filter = page.getByRole("searchbox", { name: "Filter the table" });
  await filter.fill("Development");
  await expect(page.locator(".ru-table-wrap tbody tr")).toHaveCount(1);
  await expect(page.locator(".ru-table-wrap tbody tr")).toContainText("Mark");
  await expect(page.locator(".ru-table-count")).toHaveText("1 of 4");
  await filter.fill("no such task");
  await expect(page.locator(".ru-table-none")).toHaveText("Nothing found");
  await filter.fill("");
  await expect(page.locator(".ru-table-wrap tbody tr")).toHaveCount(4);
  await expect(
    page.locator('.ru-status-pill[data-tone="success"]').first(),
  ).toHaveText("Done");
});

test("rejected block explains the error and reveals its source", async ({
  page,
}) => {
  await page.goto("/?demo=diagnostic");
  await expect(page.locator(".ru-diagnostic")).toBeVisible();
  await expect(page.locator(".ru-diagnostic-summary")).toHaveText(
    'Missing required field "value".',
  );
  await expect(page.locator(".ru-diagnostic-error")).toContainText(
    "Missing value",
  );
  await page.getByText("Show the source JSON").click();
  await expect(page.locator(".ru-diagnostic pre")).toContainText('"stat"');
  await expect(
    page.getByRole("button", { name: "Ask the model to fix" }),
  ).toBeEnabled();
});

test("progress columns expose values and product rows use square thumbnails", async ({
  page,
}) => {
  await page.goto("/?demo=dashboard");
  const bars = page.locator('.ru-table-wrap [role="progressbar"]');
  await expect(bars).toHaveCount(4);
  await expect(bars.first()).toHaveAttribute("aria-valuenow", "100");
  await expect(bars.nth(1)).toHaveAttribute("aria-valuenow", "65");
  await page.goto("/?demo=listing");
  const square = page.locator(".ru-poster-square").first();
  await expect(square).toBeVisible();
  const box = await square.boundingBox();
  expect(Math.round(box!.width)).toBe(56);
  expect(Math.round(box!.height)).toBe(56);
});

test("inline entity chips open the shared detail surface", async ({ page }) => {
  await page.goto("/?demo=films");
  const chip = page.getByRole("button", { name: "Open: Interstellar" });
  await expect(chip).toBeVisible();
  await chip.click();
  await expect(page.locator(".ru-detail h2")).toHaveText("Interstellar");
});

test("popover controls follow the page theme, not the OS", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/?demo=primitives&theme=light");
  await page.getByRole("button", { name: "Open settings" }).click();
  const panel = page.locator(".ru-primitive-popover-panel");
  await expect(panel).toBeVisible();
  expect(await panel.evaluate((el) => getComputedStyle(el).colorScheme)).toBe(
    "light",
  );
  const input = panel.locator("input");
  expect(
    await input.evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe("rgb(246, 246, 247)");
  expect(await input.evaluate((el) => getComputedStyle(el).color)).toBe(
    "rgb(32, 32, 32)",
  );

  await page.goto("/?demo=primitives&theme=dark");
  await page.getByRole("button", { name: "Open settings" }).click();
  expect(
    await page
      .locator(".ru-primitive-popover-panel")
      .evaluate((el) => getComputedStyle(el).colorScheme),
  ).toBe("dark");
});
