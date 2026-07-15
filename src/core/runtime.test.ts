import { describe, expect, it } from "vitest";
import { createStarterProject, type Project, type StoryNode } from "./project";
import { createRuntime } from "./runtime";

describe("story runtime", () => {
  it("starts at the first visible scene", () => {
    const runtime = createRuntime(createStarterProject());
    expect(runtime.start()).toMatchObject({ currentNodeId: "opening", status: "playing" });
  });

  it("advances to a choice and follows the selected port", () => {
    const runtime = createRuntime(createStarterProject());
    runtime.start();
    expect(runtime.advance().status).toBe("awaiting-choice");
    expect(runtime.choose("warehouse")).toMatchObject({ currentNodeId: "ending", status: "ended" });
  });

  it("executes variable and condition nodes before yielding", () => {
    const project = createStarterProject();
    project.nodes.push(
      { id: "set-clue", kind: "setVariable", title: "获得线索", position: { x: 0, y: 0 }, chapterId: "main-story", variableId: "affection", operation: "add", value: 3 },
      { id: "check-clue", kind: "condition", title: "检查线索", position: { x: 0, y: 0 }, chapterId: "main-story", variableId: "affection", operator: "gte", value: 3 },
    );
    project.edges = [
      { id: "a", source: "start", sourcePort: "next", target: "set-clue" },
      { id: "b", source: "set-clue", sourcePort: "next", target: "check-clue" },
      { id: "c", source: "check-clue", sourcePort: "true", target: "ending" },
      { id: "d", source: "check-clue", sourcePort: "false", target: "opening" },
    ];
    const runtime = createRuntime(project);
    expect(runtime.start()).toMatchObject({ currentNodeId: "ending", status: "ended", variables: { affection: 3 } });
  });

  it("selects a weighted random output using the injected source", () => {
    const project = graph([
      start(),
      { id: "random", kind: "random", title: "抽签", position: at(1), chapterId: "main-story", branches: [{ id: "a", label: "A", weight: 1 }, { id: "b", label: "B", weight: 3 }] },
      ending("ending-a"),
      ending("ending-b"),
    ], [edge("start", "next", "random"), edge("random", "a", "ending-a"), edge("random", "b", "ending-b")]);
    const runtime = createRuntime(project, { random: () => 0.75 });
    expect(runtime.start()).toMatchObject({ currentNodeId: "ending-b", status: "ended" });
  });

  it("waits until resume is explicitly requested", () => {
    const project = graph([
      start(),
      { id: "pause", kind: "wait", title: "停顿", position: at(1), chapterId: "main-story", durationMs: 2000 },
      scene("scene-after"),
    ], [edge("start", "next", "pause"), edge("pause", "next", "scene-after")]);
    const runtime = createRuntime(project);
    expect(runtime.start()).toMatchObject({ status: "waiting", currentNodeId: "pause", pendingInteraction: { type: "wait", durationMs: 2000 } });
    expect(runtime.resume()).toMatchObject({ status: "playing", currentNodeId: "scene-after", pendingInteraction: undefined });
  });

  it("takes the timeout port of a timed choice", () => {
    const project = graph([
      start(),
      { id: "urgent", kind: "timedChoice", title: "快选", position: at(1), chapterId: "main-story", prompt: "决定", durationMs: 3000, choices: [{ id: "stay", label: "留下" }] },
      ending("stay-ending"),
      ending("timeout-ending"),
    ], [edge("start", "next", "urgent"), edge("urgent", "stay", "stay-ending"), edge("urgent", "timeout", "timeout-ending")]);
    const runtime = createRuntime(project);
    expect(runtime.start()).toMatchObject({ status: "awaiting-choice", pendingInteraction: { type: "timed-choice", durationMs: 3000 } });
    expect(runtime.timeout()).toMatchObject({ currentNodeId: "timeout-ending", status: "ended" });
  });

  it("jumps to a chapter and continues from its output", () => {
    const project = graph([
      start(),
      { id: "jump", kind: "jump", title: "跳到第二章", position: at(1), chapterId: "main-story", targetType: "anchor", targetId: "chapter-2" },
      { id: "chapter-node", kind: "chapter", title: "第二章", position: at(2), chapterId: "main-story", anchorId: "chapter-2" },
      ending("chapter-ending"),
    ], [edge("start", "next", "jump"), edge("chapter-node", "next", "chapter-ending")]);
    expect(createRuntime(project).start()).toMatchObject({ currentNodeId: "chapter-ending", status: "ended" });
  });

  it("resolves a chapter jump through the target chapter entry", () => {
    const project = graph([
      start(),
      { id: "jump", kind: "jump", title: "Next chapter", position: at(1), chapterId: "main-story", targetType: "chapter", targetId: "chapter-two" },
      { id: "chapter-two-ending", kind: "ending", title: "Chapter two ending", endingTitle: "Done", position: at(2), chapterId: "chapter-two" },
    ], [edge("start", "next", "jump")]);
    project.chapters.push({ id: "chapter-two", name: "Chapter Two", order: 1, entryNodeId: "chapter-two-ending" });
    expect(createRuntime(project).start()).toMatchObject({ currentNodeId: "chapter-two-ending", status: "ended" });
  });

  it("applies typed variable operations", () => {
    const project = graph([
      start(),
      variableNode("subtract", "score", "subtract", 2),
      variableNode("multiply", "score", "multiply", 4),
      variableNode("append", "name", "append", "港"),
      variableNode("toggle", "flag", "toggle", false),
      ending("done"),
    ], [
      edge("start", "next", "subtract"), edge("subtract", "next", "multiply"), edge("multiply", "next", "append"), edge("append", "next", "toggle"), edge("toggle", "next", "done"),
    ], [
      { id: "score", name: "分数", type: "number", initialValue: 5 },
      { id: "name", name: "地点", type: "string", initialValue: "雾" },
      { id: "flag", name: "开关", type: "boolean", initialValue: false },
    ]);
    expect(createRuntime(project).start().variables).toEqual({ score: 12, name: "雾港", flag: true });
  });

  it("emits and consumes audio effects without browser APIs", () => {
    const project = graph([
      start(),
      { id: "music", kind: "music", title: "播放音乐", position: at(1), chapterId: "main-story", action: "play", assetId: "music-1", volume: 0.8 },
      { id: "sound", kind: "sound", title: "播放音效", position: at(2), chapterId: "main-story", assetId: "sound-1", volume: 1 },
      ending("done"),
    ], [edge("start", "next", "music"), edge("music", "next", "sound"), edge("sound", "next", "done")]);
    const runtime = createRuntime(project);
    expect(runtime.start().effects).toEqual([
      { type: "music-play", assetId: "music-1", volume: 0.8 },
      { type: "sound-play", assetId: "sound-1", volume: 1 },
    ]);
    expect(runtime.consumeEffects()).toHaveLength(2);
    expect(runtime.snapshot().effects).toEqual([]);
  });

  it("returns an explicit runtime error for division by zero", () => {
    const project = graph([start(), variableNode("divide", "score", "divide", 0), ending("done")], [edge("start", "next", "divide"), edge("divide", "next", "done")], [{ id: "score", name: "分数", type: "number", initialValue: 5 }]);
    expect(createRuntime(project).start()).toMatchObject({ status: "error", error: { code: "division-by-zero", nodeId: "divide" } });
  });
});

const at = (x: number) => ({ x: x * 100, y: 0 });
const start = (): StoryNode => ({ id: "start", kind: "start", title: "开始", position: at(0), chapterId: "main-story" });
const ending = (id: string): StoryNode => ({ id, kind: "ending", title: id, endingTitle: id, position: at(9), chapterId: "main-story" });
const scene = (id: string): StoryNode => ({ id, kind: "scene", title: id, position: at(8), chapterId: "main-story", mediaUrl: "", speaker: "", dialogue: "", showDialogue: false });
const variableNode = (id: string, variableId: string, operation: "set" | "add" | "subtract" | "multiply" | "divide" | "append" | "toggle", value: string | number | boolean): StoryNode => ({ id, kind: "setVariable", title: id, position: at(2), chapterId: "main-story", variableId, operation, value });
const edge = (source: string, sourcePort: string, target: string) => ({ id: `${source}-${sourcePort}`, source, sourcePort, target });

function graph(nodes: StoryNode[], edges: Project["edges"], variables: Project["variables"] = []): Project {
  return { ...createStarterProject(), nodes, edges, variables };
}
