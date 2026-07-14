import { describe, expect, it } from "vitest";
import { ProjectSchema, createNode, createStarterProject } from "./project";

describe("ProjectSchema", () => {
  it("accepts a starter project", () => {
    expect(ProjectSchema.parse(createStarterProject()).schemaVersion).toBe(1);
  });

  it("rejects incomplete edges", () => {
    const invalid = { ...createStarterProject(), edges: [{ id: "edge-1" }] };
    expect(() => ProjectSchema.parse(invalid)).toThrow();
  });

  it("keeps dialogue visible when loading an older scene", () => {
    const legacy = JSON.parse(JSON.stringify(createStarterProject()));
    delete legacy.nodes.find((node: { kind: string }) => node.kind === "scene").showDialogue;
    const parsed = ProjectSchema.parse(legacy);
    expect(parsed.nodes.find(node => node.kind === "scene")).toMatchObject({ showDialogue: true });
  });

  it("creates new scenes without a dialogue box", () => {
    expect(createNode("scene", 1)).toMatchObject({ showDialogue: false });
  });

  it("accepts a choice node with one option", () => {
    const project = createStarterProject();
    const singleChoice = { ...project, nodes: project.nodes.map(node => node.kind === "choice" ? { ...node, choices: [node.choices[0]] } : node) };
    expect(ProjectSchema.parse(singleChoice).nodes.find(node => node.kind === "choice")).toMatchObject({ choices: [{ id: "warehouse" }] });
  });

  it("adds default display settings to older projects", () => {
    const { display: _display, ...legacy } = createStarterProject();
    expect(ProjectSchema.parse(legacy).display).toEqual({ aspectRatio: "16:9", width: 1920, height: 1080 });
  });

  it("preserves customized display settings", () => {
    const project = { ...createStarterProject(), display: { aspectRatio: "21:9", width: 2560, height: 1080 } };
    expect(ProjectSchema.parse(project).display).toEqual(project.display);
  });
});
