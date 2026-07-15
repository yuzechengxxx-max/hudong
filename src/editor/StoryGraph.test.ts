import { describe, expect, it } from "vitest";
import { getGraphHandles, preserveAdditiveSelection, selectChapterGraph } from "./StoryGraph";
import { createNode, createStarterProject } from "../core/project";

describe("additive marquee visuals", () => {
  it("keeps the initial nodes selected while a Shift marquee is active", () => {
    const changes = [
      { type: "select" as const, id: "node-a", selected: false },
      { type: "select" as const, id: "node-b", selected: true },
    ];
    expect(preserveAdditiveSelection(changes, ["node-a"], true)).toEqual([
      { type: "select", id: "node-b", selected: true },
    ]);
  });

  it("keeps normal deselection when the marquee is not additive", () => {
    const changes = [{ type: "select" as const, id: "node-a", selected: false }];
    expect(preserveAdditiveSelection(changes, ["node-a"], false)).toEqual(changes);
  });
});

describe("graph node handles", () => {
  it("renders timed choice and random outputs from node data", () => {
    expect(getGraphHandles(createNode("timedChoice", 1)).map(handle => handle.id)).toEqual(["option-a", "option-b", "timeout"]);
    expect(getGraphHandles(createNode("random", 1)).map(handle => handle.id)).toEqual(["branch-a", "branch-b"]);
  });

  it("does not render outputs for jump and ending nodes", () => {
    expect(getGraphHandles(createNode("jump", 1))).toEqual([]);
    expect(getGraphHandles(createNode("ending", 1))).toEqual([]);
  });
});

describe("chapter graph selection", () => {
  it("filters nodes and excludes cross-chapter edges", () => {
    const project = createStarterProject();
    project.chapters.push({ id: "chapter-two", name: "第二章", order: 1, entryNodeId: "chapter-two-start" });
    project.nodes.push({ id: "chapter-two-start", kind: "start", title: "第二章开始", position: { x: 0, y: 0 }, chapterId: "chapter-two" });
    project.edges.push({ id: "cross", source: "ending", sourcePort: "next", target: "chapter-two-start" });
    const graph = selectChapterGraph(project, "chapter-two");
    expect(graph.nodes.map(node => node.id)).toEqual(["chapter-two-start"]);
    expect(graph.edges).toEqual([]);
  });
});
