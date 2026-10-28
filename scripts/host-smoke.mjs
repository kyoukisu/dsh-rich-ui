import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const root = new URL("../", import.meta.url);
const evidence = new URL(".cache/isolated-host/", root);
const html = readFileSync(new URL("page.html", evidence), "utf8");
// Reuse cookie auth already created for this disposable host; never print it.
const cookieFile = readFileSync(new URL("cookies", evidence), "utf8");
const cookies = cookieFile
  .split("\n")
  .filter(
    (line) => (line && !line.startsWith("#")) || line.startsWith("#HttpOnly_"),
  )
  .map((line) => {
    const parts = line.replace(/^#HttpOnly_/, "").split("\t");
    return {
      name: parts[5],
      value: parts[6],
      domain: parts[0],
      path: parts[2],
      httpOnly: line.startsWith("#HttpOnly_"),
      secure: parts[3] === "TRUE",
      sameSite: "Lax",
    };
  })
  .filter((cookie) => cookie.name && cookie.value);
if (!html.includes("@kyoukisu/dsh-rich-ui") || !cookies.length)
  throw new Error("Isolated host boot/cookie evidence missing");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  await page.context().addCookies(cookies);
  await page.goto("http://127.0.0.1:3189/");
  await page.waitForSelector("[data-dsh-boot]", {
    state: "detached",
    timeout: 30000,
  });
  const result = await page.evaluate(async () => {
    const fixture = document.createElement("section");
    fixture.dataset.chatFlowKind = "assistant-step";
    fixture.dataset.chatAnchorKey = "host-smoke-assistant-step1:0";
    fixture.style.cssText =
      "position:fixed;inset:40px;z-index:999999;background:#ffffff;color:#111827;padding:24px;overflow:auto";
    function block(language, raw) {
      const surface = document.createElement("div");
      surface.className = "md-code-block";
      const label = document.createElement("div");
      label.textContent = language;
      const body = document.createElement("pre");
      body.textContent = raw;
      surface.append(label, body);
      fixture.append(surface);
      return surface;
    }
    const valid = block(
      "rich-ui",
      JSON.stringify({
        version: 1,
        initialState: { enabled: false },
        nodes: [
          {
            type: "text",
            content: "Real isolated DSH plugin fixture",
            variant: "title",
          },
          { type: "switch", stateKey: "enabled", label: "Local switch" },
          {
            type: "computed",
            label: "Current value",
            expr: { state: "enabled" },
          },
        ],
      }),
    );
    const malformed = block("rich-ui", "{broken");
    const other = block("javascript", 'console.log("unchanged")');
    const dsh = block("dsh-ui", "{}");
    document.body.append(fixture);
    for (
      let i = 0;
      i < 50 && !fixture.querySelector("[data-rich-ui-root] input");
      i++
    )
      await new Promise((resolve) => setTimeout(resolve, 100));
    const input = fixture.querySelector("[data-rich-ui-root] input");
    if (!(input instanceof HTMLInputElement))
      throw new Error("Real host did not mount switch");
    const before = input.checked;
    input.click();
    await new Promise((resolve) => setTimeout(resolve, 100));
    return {
      validHidden: valid.hidden,
      roots: fixture.querySelectorAll("[data-rich-ui-root]").length,
      switchBefore: before,
      switchAfter: input.checked,
      computedUpdated: fixture
        .querySelector("[data-rich-ui-root]")
        ?.textContent?.includes("true"),
      malformedVisible: !malformed.hidden,
      ordinaryCodeVisible: !other.hidden,
      dshUiNotClaimed:
        !dsh.hidden &&
        !dsh.nextElementSibling?.hasAttribute("data-rich-ui-root"),
      transcriptReplay: false,
      modelActionRoundTrip: false,
    };
  });
  mkdirSync(evidence, { recursive: true });
  await page.screenshot({ path: new URL("host-smoke.png", evidence).pathname });
  writeFileSync(
    new URL("host-smoke.json", evidence),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
  if (
    !result.validHidden ||
    result.roots !== 1 ||
    result.switchBefore ||
    !result.switchAfter ||
    !result.computedUpdated ||
    !result.malformedVisible ||
    !result.ordinaryCodeVisible ||
    !result.dshUiNotClaimed
  )
    throw new Error("Host smoke assertions failed");
  // The host remains running. Do not simulate provider-backed action delivery.
} finally {
  await browser.close();
}
