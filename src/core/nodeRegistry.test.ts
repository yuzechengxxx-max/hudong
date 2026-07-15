import { describe, expect, it } from "vitest";
import { createNode } from "./project";
import { getNodeDefinition, getNodeOutputs, nodeDefinitions } from "./nodeRegistry";

describe("node registry", () => {
  it("registers every persisted node kind exactly once", () => {
    expect(nodeDefinitions.map(item => item.kind)).toEqual([
      "start", "scene", "choice", "timedChoice", "condition",
      "setVariable", "random", "wait", "music", "sound",
      "chapter", "jump", "ending",
    ]);
    expect(new Set(nodeDefinitions.map(item => item.kind)).size).toBe(nodeDefinitions.length);
  });

  it("provides creator-facing metadata for search and grouping", () => {
    expect(getNodeDefinition("random")).toMatchObject({
      label: "随机分支",
      category: "logic",
      runtimeMode: "automatic",
    });
    expect(getNodeDefinition("music").searchTerms).toContain("背景音乐");
  });

  it("derives dynamic ports from choice and random branch data", () => {
    expect(getNodeOutputs(createNode("timedChoice", 1)).map(port => port.id))
      .toEqual(["option-a", "option-b", "timeout"]);
    expect(getNodeOutputs(createNode("random", 2)).map(port => port.id))
      .toEqual(["branch-a", "branch-b"]);
  });

  it("derives fixed ports for automatic and terminal nodes", () => {
    expect(getNodeOutputs(createNode("condition", 1)).map(port => port.id)).toEqual(["true", "false"]);
    expect(getNodeOutputs(createNode("wait", 1)).map(port => port.id)).toEqual(["next"]);
    expect(getNodeOutputs(createNode("jump", 1))).toEqual([]);
    expect(getNodeOutputs(createNode("ending", 1))).toEqual([]);
  });
});
