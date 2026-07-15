import { describe, expect, it } from "vitest";
import { diagnoseProject } from "./diagnostics";
import { createStarterProject } from "./project";

describe("project diagnostics", () => {
  it("finds unreachable nodes", () => {
    const project = createStarterProject();
    project.nodes.push({ id: "orphan", kind: "ending", title: "孤立结局", endingTitle: "孤立结局", position: { x: 0, y: 0 }, chapterId: "main-story" });
    expect(diagnoseProject(project)).toContainEqual(expect.objectContaining({ code: "unreachable-node", nodeId: "orphan" }));
  });

  it("reports every unconnected dynamic output", () => {
    const project = createStarterProject();
    project.edges = project.edges.filter(edge => edge.sourcePort !== "call");
    expect(diagnoseProject(project)).toContainEqual(expect.objectContaining({ code: "missing-output", nodeId: "choice", portId: "call" }));
  });

  it("reports missing jump targets and duplicate chapters", () => {
    const project = createStarterProject();
    project.nodes.push(
      { id: "jump", kind: "jump", title: "跳转", position: { x: 0, y: 0 }, chapterId: "main-story", targetType: "anchor", targetId: "missing" },
      { id: "chapter-a", kind: "chapter", title: "第一章 A", position: { x: 0, y: 0 }, chapterId: "main-story", anchorId: "chapter-1" },
      { id: "chapter-b", kind: "chapter", title: "第一章 B", position: { x: 0, y: 0 }, chapterId: "main-story", anchorId: "chapter-1" },
    );
    const issues = diagnoseProject(project);
    expect(issues).toContainEqual(expect.objectContaining({ code: "missing-jump-target", nodeId: "jump" }));
    expect(issues).toContainEqual(expect.objectContaining({ code: "duplicate-chapter", nodeId: "chapter-b" }));
  });

  it("reports missing variables and incompatible operations", () => {
    const project = createStarterProject();
    project.variables.push({ id: "name", name: "姓名", type: "string", initialValue: "林夏" });
    project.nodes.push(
      { id: "missing-var", kind: "condition", title: "未知变量", position: { x: 0, y: 0 }, chapterId: "main-story", variableId: "missing", operator: "eq", value: 1 },
      { id: "bad-operation", kind: "setVariable", title: "错误运算", position: { x: 0, y: 0 }, chapterId: "main-story", variableId: "name", operation: "multiply", value: 2 },
    );
    const issues = diagnoseProject(project);
    expect(issues).toContainEqual(expect.objectContaining({ code: "missing-variable", nodeId: "missing-var" }));
    expect(issues).toContainEqual(expect.objectContaining({ code: "invalid-variable-operation", nodeId: "bad-operation" }));
  });

  it("reports missing and wrong-type audio assets", () => {
    const project = createStarterProject();
    project.assets.push({ id: "poster", name: "海报", type: "image/png", size: 1, url: "poster.png" });
    project.nodes.push(
      { id: "music", kind: "music", title: "音乐", position: { x: 0, y: 0 }, chapterId: "main-story", action: "play", assetId: "missing", volume: 1 },
      { id: "sound", kind: "sound", title: "音效", position: { x: 0, y: 0 }, chapterId: "main-story", assetId: "poster", volume: 1 },
    );
    const issues = diagnoseProject(project);
    expect(issues).toContainEqual(expect.objectContaining({ code: "missing-asset", nodeId: "music" }));
    expect(issues).toContainEqual(expect.objectContaining({ code: "invalid-asset-type", nodeId: "sound" }));
  });

  it("reports invalid weights, durations, and division by zero", () => {
    const project = createStarterProject();
    project.nodes.push(
      { id: "random", kind: "random", title: "随机", position: { x: 0, y: 0 }, chapterId: "main-story", branches: [{ id: "a", label: "A", weight: 0 }, { id: "b", label: "B", weight: 1 }] },
      { id: "wait", kind: "wait", title: "等待", position: { x: 0, y: 0 }, chapterId: "main-story", durationMs: 0 },
      { id: "divide", kind: "setVariable", title: "除法", position: { x: 0, y: 0 }, chapterId: "main-story", variableId: "affection", operation: "divide", value: 0 },
    );
    const issues = diagnoseProject(project);
    expect(issues).toContainEqual(expect.objectContaining({ code: "invalid-random-weight", nodeId: "random" }));
    expect(issues).toContainEqual(expect.objectContaining({ code: "invalid-duration", nodeId: "wait" }));
    expect(issues).toContainEqual(expect.objectContaining({ code: "division-by-zero", nodeId: "divide" }));
  });

  it("validates chapter ownership, entries, edges, and chapter jump targets", () => {
    const project = createStarterProject();
    project.chapters.push({ id: "chapter-two", name: "第二章", order: 1, entryNodeId: "missing-entry" });
    project.nodes.push(
      { id: "chapter-two-ending", kind: "ending", title: "第二章结局", endingTitle: "结束", position: { x: 0, y: 0 }, chapterId: "chapter-two" },
      { id: "missing-chapter-jump", kind: "jump", title: "错误跳转", position: { x: 0, y: 0 }, chapterId: "main-story", targetType: "chapter", targetId: "missing-chapter" },
    );
    project.edges.push({ id: "cross-chapter", source: "ending", sourcePort: "next", target: "chapter-two-ending" });
    const issues = diagnoseProject(project);
    expect(issues).toContainEqual(expect.objectContaining({ code: "invalid-chapter-entry", chapterId: "chapter-two" }));
    expect(issues).toContainEqual(expect.objectContaining({ code: "cross-chapter-edge", nodeId: "ending", chapterId: "main-story" }));
    expect(issues).toContainEqual(expect.objectContaining({ code: "missing-chapter-target", nodeId: "missing-chapter-jump", chapterId: "main-story" }));
  });

  it("reports an undeclared default chapter", () => {
    const project = { ...createStarterProject(), defaultChapterId: "missing" };
    expect(diagnoseProject(project)).toContainEqual(expect.objectContaining({ code: "missing-default-chapter" }));
  });
});
