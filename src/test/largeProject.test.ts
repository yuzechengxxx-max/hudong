import { describe, expect, it } from "vitest";
import { diagnoseProject } from "../core/diagnostics";
import { selectChapterGraph } from "../editor/StoryGraph";
import { createLargeProject } from "./largeProject";

describe("large project fixtures", () => {
  it("creates deterministic 3000-node projects across ten chapters", () => {
    const project = createLargeProject(3000, 10);
    expect(project.nodes).toHaveLength(3000);
    expect(project.chapters).toHaveLength(10);
    expect(project.chapters.map(chapter => chapter.order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(new Set(project.nodes.map(node => node.id)).size).toBe(3000);
  });

  it("renders only the selected chapter while diagnostics retain global locations", () => {
    const project = createLargeProject(3000, 10);
    const graph = selectChapterGraph(project, "chapter-5");
    expect(graph.nodes).toHaveLength(300);
    expect(graph.nodes.every(node => node.chapterId === "chapter-5")).toBe(true);
    const issues = diagnoseProject(project);
    expect(issues.filter(issue => issue.nodeId && !project.nodes.some(node => node.id === issue.nodeId))).toEqual([]);
    expect(issues.filter(issue => issue.code === "missing-node-chapter" || issue.code === "cross-chapter-edge" || issue.code === "missing-chapter-target")).toEqual([]);
  });

  it.each([[300, 3], [1000, 5]])("keeps %i nodes structurally valid", (total, chapters) => {
    const project = createLargeProject(total, chapters);
    expect(project.nodes).toHaveLength(total);
    expect(project.chapters.every(chapter => project.nodes.some(node => node.id === chapter.entryNodeId && node.chapterId === chapter.id))).toBe(true);
  });
});
