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
    ".ru-entity-card[aria-label='Подробнее: Interstellar']",
  );
  await card.click();
  const dialog = page.locator(".ru-detail");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "Interstellar", exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Изображение 2" }).click();
  await expect(
    dialog.getByRole("button", { name: "Изображение 2" }),
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
  await expect(page.locator(".ru-computed output")).toHaveText(/70\s?246/);
  const rate = page.getByRole("slider", { name: "Годовая доходность, %" });
  await rate.fill("0");
  await expect(page.locator(".ru-computed output")).toHaveText(/50\s?000/);
  await page.getByRole("button", { name: "Сбросить параметры" }).click();
  await expect(rate).toHaveValue("12");
  await expect(page.locator(".ru-computed output")).toHaveText(/70\s?246/);
});
test("configurator updates text, conditional chart, tabs and notification locally", async ({
  page,
}) => {
  await page.goto("/?demo=configurator");
  await page
    .getByRole("textbox", { name: "Название проекта" })
    .fill("Новая система");
  await expect(page.locator(".ru-title")).toHaveText("Новая система");
  await expect(
    page.getByRole("img", { name: "Линейный график" }),
  ).toBeVisible();
  await page.getByRole("switch", { name: "Включить аналитику" }).uncheck();
  await expect(page.getByRole("img", { name: "Линейный график" })).toHaveCount(
    0,
  );
  await page.getByRole("tab", { name: "Таблица" }).click();
  await expect(page.getByRole("table")).toBeVisible();
  await page.getByRole("switch", { name: "Показывать уведомления" }).check();
  await expect(
    page.getByText("Уведомления включены в предварительном просмотре."),
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
    .locator(".ru-entity-card[aria-label='Подробнее: Interstellar']")
    .click();
  if (isMobile) {
    await expect(
      page.getByRole("button", { name: "Закрыть подробности" }),
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
      page.getByRole("button", { name: "Переключить тему" }),
    ).toBeEnabled();
  }
  await page.getByRole("button", { name: "Закрыть подробности" }).click();
  await expect(page.locator(".ru-detail")).toHaveCount(0);
});
test("renderer passes automated accessibility checks", async ({ page }) => {
  for (const demo of [
    "dashboard",
    "technical",
    "films",
    "calculator",
    "configurator",
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
  const row = page.locator(".ru-entity-row[aria-label='Подробнее: Arrival']");
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
  await expect(firstTask).toHaveText("Дизайн");
  await page.locator("th", { hasText: "Прогресс" }).locator("button").click();
  await expect(firstTask).toHaveText("Тестирование");
  await expect(page.locator("th", { hasText: "Прогресс" })).toHaveAttribute(
    "aria-sort",
    "ascending",
  );
});

test("chart exposes axes, series legend and a hover readout", async ({
  page,
}) => {
  await page.goto("/?demo=dashboard");
  await expect(page.locator(".ru-chart .ru-axis-unit")).toHaveText("тыс. ₽");
  await expect(page.locator(".ru-chart figcaption")).toContainText("Выручка");
  await page.locator(".ru-chart-hit").nth(3).hover();
  await expect(page.locator(".ru-chart-tip")).toContainText("Апр");
  await expect(page.locator(".ru-chart-tip")).toContainText("91 тыс. ₽");
});

test("diagram steps keep their order and connector labels", async ({
  page,
}) => {
  await page.goto("/?demo=dashboard");
  const steps = page.locator(".ru-diagram-card strong");
  await expect(steps).toHaveCount(4);
  await expect(steps.first()).toHaveText("Запрос");
  await expect(page.locator(".ru-diagram-edge").first()).toContainText(
    "описание интерфейса",
  );
});
