import { describe, expect, it } from "vitest";
import { diagnoseProject } from "./diagnostics";
import { createStarterProject } from "./project";

describe("project diagnostics", () => {
  it("finds unreachable nodes", () => {
    const project = createStarterProject();
    project.nodes.push({ id: "orphan", kind: "ending", title: "孤立结局", endingTitle: "孤立结局", position: { x: 0, y: 0 } });
    expect(diagnoseProject(project)).toContainEqual(expect.objectContaining({ code: "unreachable-node", nodeId: "orphan" }));
  });
});
