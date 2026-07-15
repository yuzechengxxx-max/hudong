import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const browser = await chromium.launch({ headless: true });
const errors = [];
const baseUrl = process.argv[2] ?? "http://127.0.0.1:4180/";
await mkdir("outputs/qa", { recursive: true });

async function capture(name, theme, viewport) {
  const page = await browser.newPage({ viewport });
  page.on("console", message => {
    if (message.type() === "error") errors.push(`${name}: ${message.text()}`);
  });
  await page.addInitScript(value => localStorage.setItem("flowfilm-editor-theme", value), theme);
  await page.goto(baseUrl, { waitUntil: "networkidle" });
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
  return { name, theme, viewport, boxes, backgroundMarkup, backgroundDotStyle, resizeEvidence };
}

async function captureNodeWorkflow() {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("console", message => { if (message.type() === "error") errors.push(`node-workflow: ${message.text()}`); });
  await page.addInitScript(() => { localStorage.clear(); localStorage.setItem("flowfilm-editor-theme", "dark"); });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator(".react-flow__pane").dblclick({ position: { x: 650, y: 430 } });
  await page.getByRole("searchbox", { name: "搜索节点" }).fill("随机");
  await page.screenshot({ path: "outputs/qa/flowfilm-node-menu-v2.png" });
  await page.getByRole("button", { name: "随机分支" }).click();
  await page.getByRole("button", { name: "添加分支" }).click();
  await page.waitForFunction(() => document.querySelectorAll(".graph-node[data-kind='random'] .graph-handle.output").length === 3);
  const inspector = await page.locator(".inspector-float").evaluate(element => ({ scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }));
  const outputHandles = await page.locator(".graph-node[data-kind='random'] .graph-handle.output").count();
  const overlayCount = await page.locator("vite-error-overlay").count();
  await page.screenshot({ path: "outputs/qa/flowfilm-random-inspector-v2.png" });
  await page.close();
  return { name: "node-workflow", outputHandles, inspector, overlayCount };
}

async function captureProjectManagement() {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("console", message => { if (message.type() === "error") errors.push(`project-management: ${message.text()}`); });
  await page.addInitScript(() => { localStorage.clear(); localStorage.setItem("flowfilm-editor-theme", "dark"); });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "保存项目" }).click();
  await page.getByRole("button", { name: "打开项目" }).click();
  await page.getByText("手动保存").waitFor();
  await page.getByRole("button", { name: "新建章节" }).click();
  await page.waitForFunction(() => document.querySelectorAll(".chapter-row").length === 2);
  const chapterId = await page.locator("[data-testid='story-graph']").getAttribute("data-chapter-id");
  const drawer = await page.locator(".workspace-drawer").evaluate(element => ({ scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }));
  const recoveryCount = await page.locator(".recovery-row").count();
  const variableCount = await page.locator(".variable-editor-row").count();
  await page.screenshot({ path: "outputs/qa/flowfilm-project-management.png" });
  await page.close();
  return { name: "project-management", chapterId, drawer, recoveryCount, variableCount };
}

const results = [
  await capture("dark-1440", "dark", { width: 1440, height: 900 }),
  await capture("light-1440", "light", { width: 1440, height: 900 }),
  await capture("light-900", "light", { width: 900, height: 700 }),
  await captureNodeWorkflow(),
  await captureProjectManagement(),
];

await browser.close();
console.log(JSON.stringify({ results, errors }, null, 2));
