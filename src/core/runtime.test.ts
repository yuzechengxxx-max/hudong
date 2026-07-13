import { describe, expect, it } from "vitest";
import { createStarterProject } from "./project";
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
      { id: "set-clue", kind: "setVariable", title: "获得线索", position: { x: 0, y: 0 }, variableId: "affection", operation: "add", value: 3 },
      { id: "check-clue", kind: "condition", title: "检查线索", position: { x: 0, y: 0 }, variableId: "affection", operator: "gte", value: 3 },
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
});
