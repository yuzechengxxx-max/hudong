import { describe, expect, it } from "vitest";
import { createExportPlayerHtml } from "./exportPlayer";
import { createNode, createStarterProject } from "./project";

describe("export player", () => {
  it("contains handlers for every phase-one runtime node", () => {
    const project = createStarterProject();
    project.nodes.push(...(["timedChoice", "random", "wait", "music", "sound", "chapter", "jump"] as const).map((kind, index) => createNode(kind, index)));
    const html = createExportPlayerHtml(project);
    for (const kind of ["timedChoice", "random", "wait", "music", "sound", "chapter", "jump"]) expect(html).toContain(`'${kind}'`);
    expect(html).toContain("schemaVersion");
  });

  it("escapes creator text that could terminate the embedded script", () => {
    const project = createStarterProject();
    project.title = "</script><script>alert(1)</script>";
    const html = createExportPlayerHtml(project);
    expect(html).not.toContain("</script><script>alert(1)");
    expect(html).toContain("\\u003c/script>");
  });
});
