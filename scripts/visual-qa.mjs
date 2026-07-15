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
  const boxes = await page.locator("[data-testid='tool-island'], .workspace-rail, .inspector-float, [data-testid='status-float']").evaluateAll(elements => elements.map(element => ({
    name: element.getAttribute("data-testid") || element.className,
    rect: element.getBoundingClientRect().toJSON(),
    overflowX: getComputedStyle(element).overflowX,
  })));
  const backgroundMarkup = await page.locator(".react-flow__background").evaluate(element => element.outerHTML);
  const backgroundDotStyle = await page.locator(".react-flow__background-pattern.dots").evaluate(element => ({ fill: getComputedStyle(element).fill, opacity: getComputedStyle(element).opacity }));
  await page.close();
  return { name, theme, viewport, boxes, backgroundMarkup, backgroundDotStyle };
}

const results = [
  await capture("dark-1440", "dark", { width: 1440, height: 900 }),
  await capture("light-1440", "light", { width: 1440, height: 900 }),
  await capture("light-900", "light", { width: 900, height: 700 }),
];

await browser.close();
console.log(JSON.stringify({ results, errors }, null, 2));
