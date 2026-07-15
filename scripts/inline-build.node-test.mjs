import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { resolve } from "node:path";
import { chromium } from "playwright";

const root = resolve(import.meta.dirname, "..");
const outputPath = resolve(root, "outputs/flowfilm-engine.html");

test("standalone build opens from file without external assets", async () => {
  const build = spawnSync(process.execPath, [resolve(root, "scripts/inline-build.mjs")], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(build.status, 0, build.stderr || build.stdout);

  const html = await readFile(outputPath, "utf8");
  assert.doesNotMatch(html, /(?:src|href)=["']\/assets\//);
  assert.doesNotMatch(html, /rel=["']modulepreload["']/);

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto(`file:///${outputPath.replaceAll("\\", "/")}`);
    await page.locator("#root").waitFor({ state: "attached" });
    await page.waitForTimeout(500);

    assert.match(await page.locator("#root").innerText(), /FlowFilm/);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
