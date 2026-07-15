import { describe, expect, it } from "vitest";
import { createStarterProject, type Project } from "../core/project";
import { changeVariableType, deleteUnusedVariable, indexVariableReferences, replaceAndDeleteVariable, updateVariable } from "./variableCommands";

function variableFixture(): Project {
  const project = createStarterProject();
  project.variables.push({ id: "backup-score", name: "备用分数", type: "number", initialValue: 0 });
  project.nodes.push(
    { id: "score-condition", kind: "condition", title: "检查分数", position: { x: 0, y: 0 }, chapterId: "main-story", variableId: "affection", operator: "gte", value: 1 },
    { id: "score-add", kind: "setVariable", title: "增加分数", position: { x: 0, y: 0 }, chapterId: "main-story", variableId: "affection", operation: "add", value: 1 },
  );
  return project;
}

describe("variable commands", () => {
  it("indexes references with chapter and node locations", () => {
    expect(indexVariableReferences(variableFixture()).get("affection")).toEqual([
      { nodeId: "score-condition", chapterId: "main-story", kind: "condition" },
      { nodeId: "score-add", chapterId: "main-story", kind: "setVariable" },
    ]);
  });

  it("blocks incompatible variable type changes with locatable references", () => {
    const result = changeVariableType(variableFixture(), "affection", "string");
    expect(result).toEqual({ ok: false, nodeIds: ["score-condition", "score-add"] });
  });

  it("converts safe defaults when changing an unused variable type", () => {
    const project = variableFixture();
    const result = changeVariableType(project, "backup-score", "string");
    expect(result.ok && result.project.variables.find(variable => variable.id === "backup-score")).toMatchObject({ type: "string", initialValue: "0" });
  });

  it("replaces references before deleting a used variable", () => {
    const result = replaceAndDeleteVariable(variableFixture(), "affection", "backup-score");
    expect(result.variables.some(variable => variable.id === "affection")).toBe(false);
    expect(result.nodes.filter(node => node.kind === "condition" || node.kind === "setVariable").every(node => node.variableId !== "affection")).toBe(true);
  });

  it("only deletes unused variables and updates editable fields immutably", () => {
    const project = variableFixture();
    expect(() => deleteUnusedVariable(project, "affection")).toThrow("still referenced");
    const updated = updateVariable(project, "backup-score", { name: "后备分数", initialValue: 5 });
    expect(deleteUnusedVariable(updated, "backup-score").variables.some(variable => variable.id === "backup-score")).toBe(false);
    expect(project.variables.find(variable => variable.id === "backup-score")?.name).toBe("备用分数");
  });
});
