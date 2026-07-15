import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const browser = await chromium.launch({ headless: true });
const errors = [];
await mkdir("outputs/qa", { recursive: true });

async function capture(name, theme, viewport) {
  const page = await browser.newPage({ viewport });
  page.on("console", message => {
    if (message.type() === "error") errors.push(`${name}: ${message.text()}`);
  });
  await page.addInitScript(value => localStorage.setItem("flowfilm-editor-theme", value), theme);
  await page.goto("http://127.0.0.1:4180/", { waitUntil: "networkidle" });
  await page.screenshot({ path: `outputs/qa/flowfilm-${name}.png` });
  if (theme === "light") {
    const command = page.locator(".preview-command").first();
    if (await command.count()) {
      await command.hover();
      await page.screenshot({ path: `outputs/qa/flowfilm-${name}-hover.png` });
    }
  }
  const boxes = await page.locator("[data-testid='tool-island'], .workspace-rail, .inspector-float, [data-testid='status-float']").evaluateAll(elements => elements.map(element => ({
    name: element.getAttribute("data-testid") || element.className,
    rect: element.getBoundingClientRect().toJSON(),
    overflowX: getComputedStyle(element).overflowX,
  })));
  const backgroundMarkup = await page.locator(".react-flow__background").evaluate(element => element.outerHTML);
  const backgroundDotStyle = await page.locator(".react-flow__background-pattern.dots").evaluate(element => ({ fill: getComputedStyle(element).fill, opacity: getComputedStyle(element).opacity }));
  let resizeEvidence = null;
  let navigationEvidence = null;
  const viewportLayer = page.locator(".react-flow__viewport");
  const pane = page.locator(".react-flow__pane");
  if (await viewportLayer.count() && await pane.count()) {
    const beforeTransform = await viewportLayer.getAttribute("style");
    const paneBox = await pane.boundingBox();
    if (paneBox) {
      await page.mouse.move(paneBox.x + 500, paneBox.y + 500);
      await page.mouse.down({ button: "middle" });
      await page.mouse.move(paneBox.x + 560, paneBox.y + 535);
      await page.mouse.up({ button: "middle" });
      const afterPanTransform = await viewportLayer.getAttribute("style");
      await page.mouse.move(paneBox.x + 500, paneBox.y + 500);
      await page.mouse.wheel(0, -420);
      const afterWheelTransform = await viewportLayer.getAttribute("style");
      navigationEvidence = { beforeTransform, afterPanTransform, afterWheelTransform };
    }
  }
  const resizeHandle = page.getByRole("separator", { name: "调整属性面板大小" });
  if (await resizeHandle.count()) {
    const before = await page.locator(".inspector-float").boundingBox();
    const handleBox = await resizeHandle.boundingBox();
    if (before && handleBox) {
      await page.mouse.move(handleBox.x + 7, handleBox.y + handleBox.height - 7);
      await page.mouse.down();
      await page.mouse.move(handleBox.x - 70, handleBox.y + handleBox.height - 7);
      await page.mouse.up();
      await page.waitForTimeout(80);
      const after = await page.locator(".inspector-float").boundingBox();
      resizeEvidence = { beforeWidth: before.width, afterWidth: after?.width };
    }
  }
  await page.close();
  return { name, theme, viewport, boxes, backgroundMarkup, backgroundDotStyle, resizeEvidence, navigationEvidence };
}

const results = [
  await capture("dark-1440", "dark", { width: 1440, height: 900 }),
  await capture("light-1440", "light", { width: 1440, height: 900 }),
  await capture("light-900", "light", { width: 900, height: 700 }),
];

await browser.close();
console.log(JSON.stringify({ results, errors }, null, 2));
