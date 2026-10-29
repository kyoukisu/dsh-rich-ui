import { expect, test } from "@playwright/test";

test.describe("primitives browser QA", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?demo=primitives");
    await expect(
      page.getByRole("region", { name: "Interactive primitives" }),
    ).toBeVisible();
  });

  test("primitives popover focuses content and closes on Escape, outside pointer and Tab-away", async ({
    page,
  }) => {
    const trigger = page.getByRole("button", { name: "Open settings" });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const panel = page.getByRole("region", { name: "Open settings" });
    await expect(panel).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "Note title" }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.getByRole("button", { name: "Outside button" }).click();
    await expect(panel).toHaveCount(0);
    await trigger.click();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Save locally" }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(panel).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Primitives help" }),
    ).toBeFocused();
  });

  test("primitives tooltip has a real description on keyboard focus and Escape does not move focus", async ({
    page,
  }) => {
    const help = page.getByRole("button", { name: "Primitives help" });
    await help.focus();
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toHaveText(
      "The hint appears on hover and on focus",
    );
    await expect(help).toHaveAccessibleDescription(
      "The hint appears on hover and on focus",
    );
    await page.keyboard.press("Escape");
    await expect(tooltip).toHaveCount(0);
    await expect(help).toBeFocused();
    await page.getByRole("button", { name: "Outside button" }).focus();
    await help.focus();
    await expect(tooltip).toBeVisible();
    await page.getByRole("button", { name: "Outside button" }).focus();
    await help.hover();
    await expect(tooltip).toBeVisible();
    await tooltip.hover();
    await expect(tooltip).toBeVisible();
    await page.mouse.move(0, 0);
    await expect(tooltip).toHaveCount(0);
  });

  test("primitives lightbox is native modal, keeps background inert and supports gallery keys", async ({
    page,
  }) => {
    const trigger = page.getByRole("button", {
      name: "Open the practice gallery",
    });
    // Role queries exclude the native modal's inert background; use a DOM locator for this negative focus probe.
    const outside = page
      .locator("button")
      .filter({ hasText: /^Outside button$/ });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Practice gallery" });
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((element) => element.matches(":modal"))).toBe(
      true,
    );
    const close = page.getByRole("button", { name: "Close gallery" });
    await expect(close).toBeFocused();
    // Native modal inertness rejects programmatic focus outside its top-layer subtree.
    await outside.evaluate((element: HTMLElement) => element.focus());
    await expect(close).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(
      page.getByRole("button", { name: "Next image" }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(close).toBeFocused();
    const image = dialog.getByRole("img", { name: "Practice gallery" });
    await expect
      .poll(() =>
        image.evaluate(
          (element: HTMLImageElement) =>
            element.complete && element.naturalWidth > 0,
        ),
      )
      .toBe(true);
    const initial = await image.getAttribute("src");
    await page.keyboard.press("ArrowRight");
    await expect(dialog.getByRole("status")).toHaveText("2 / 3");
    expect(await image.getAttribute("src")).not.toBe(initial);
    await page.keyboard.press("End");
    await expect(dialog.getByRole("status")).toHaveText("3 / 3");
    await page.keyboard.press("ArrowRight");
    await expect(dialog.getByRole("status")).toHaveText("1 / 3");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await outside.focus();
    await expect(outside).toBeFocused();
  });

  test("primitives modal closes through backdrop and fits desktop/mobile in both themes", async ({
    page,
  }) => {
    for (const theme of ["light", "dark"]) {
      await page.goto(`/?demo=primitives&theme=${theme}`);
      const trigger = page.getByRole("button", {
        name: "Open the practice gallery",
      });
      await trigger.click();
      const dialog = page.getByRole("dialog", { name: "Practice gallery" });
      await expect(dialog).toBeVisible();
      const geometry = await dialog.boundingBox();
      const viewport = page.viewportSize()!;
      expect(geometry!.x).toBeGreaterThanOrEqual(0);
      expect(geometry!.y).toBeGreaterThanOrEqual(0);
      expect(geometry!.x + geometry!.width).toBeLessThanOrEqual(
        viewport.width + 1,
      );
      expect(geometry!.y + geometry!.height).toBeLessThanOrEqual(
        viewport.height + 1,
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.mouse.click(2, 2);
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
    }
  });
});
