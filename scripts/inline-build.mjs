import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const build = spawnSync(process.execPath, [
  resolve(root, "node_modules/vite/bin/vite.js"),
  "build",
  "--mode",
  "standalone",
  "--configLoader",
  "runner",
], { cwd: root, encoding: "utf8" });
if (build.status !== 0) throw new Error(build.stderr || build.stdout || "Standalone build failed");

const html = await readFile(resolve(root, "dist/index.html"), "utf8");
const cssPath = html.match(/href="([^"]+\.css)"/)?.[1];
const jsPath = html.match(/src="([^"]+\.js)"/)?.[1];
if (!cssPath || !jsPath) throw new Error("Built CSS or JS asset was not found");
const css = await readFile(resolve(root, "dist", cssPath.replace(/^\//, "")), "utf8");
const js = await readFile(resolve(root, "dist", jsPath.replace(/^\//, "")), "utf8");
const encodedJs = Buffer.from(js, "utf8").toString("base64");
const output = html
  .replace(/<link[^>]+rel="modulepreload"[^>]*>\s*/g, "")
  .replace(/<link[^>]+href="[^"]+\.css"[^>]*>/g, "")
  .replace("<div id=\"root\"></div>", `<style>${css}</style><div id="root"></div>`)
  .replace(
    /<script[^>]+src="[^"]+\.js"[^>]*><\/script>/,
    `<script type="module">const raw=atob("${encodedJs}");const bytes=Uint8Array.from(raw,char=>char.charCodeAt(0));import(URL.createObjectURL(new Blob([bytes],{type:"text/javascript;charset=utf-8"})));</script>`,
  );
await mkdir(resolve(root, "outputs"), { recursive: true });
await writeFile(resolve(root, "outputs/flowfilm-engine.html"), output, "utf8");
