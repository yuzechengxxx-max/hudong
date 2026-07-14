import { describe, expect, it } from "vitest";
import { createStarterProject } from "../core/project";
import { duplicateSelection, removeSelection } from "./projectCommands";

describe("project editor commands", () => {
  it("duplicates selected nodes with new ids and copies internal edges", () => {
    const project = createStarterProject();
    const result = duplicateSelection(project, ["opening", "choice"], 32, "copy-1");

    expect(result.selectedIds).toHaveLength(2);
    expect(result.project.nodes).toHaveLength(project.nodes.length + 2);
    const copiedScene = result.project.nodes.find(node => node.id === result.selectedIds[0]);
    const copiedChoice = result.project.nodes.find(node => node.id === result.selectedIds[1]);
    expect(copiedScene?.position).toEqual({ x: 307, y: 142 });
    expect(copiedChoice?.position).toEqual({ x: 547, y: 222 });
    expect(result.project.edges).toContainEqual(expect.objectContaining({ source: copiedScene?.id, target: copiedChoice?.id }));
  });

  it("regenerates copied choice port ids and remaps their edges", () => {
    const project = createStarterProject();
    const result = duplicateSelection(project, ["choice", "ending"], 24, "copy-2");
    const copiedChoice = result.project.nodes.find(node => node.id === result.selectedIds[0]);
    expect(copiedChoice?.kind).toBe("choice");
    if (copiedChoice?.kind !== "choice") return;
    expect(copiedChoice.choices.map(choice => choice.id)).not.toEqual(["warehouse", "call"]);
    expect(result.project.edges.filter(edge => edge.source === copiedChoice.id)).toHaveLength(2);
    expect(result.project.edges.filter(edge => edge.source === copiedChoice.id).map(edge => edge.sourcePort)).toEqual(copiedChoice.choices.map(choice => choice.id));
  });

  it("removes multiple nodes and all connected edges but preserves the start node", () => {
    const project = createStarterProject();
    const result = removeSelection(project, ["start", "opening", "choice"]);
    expect(result.nodes.map(node => node.id)).toEqual(["start", "ending"]);
    expect(result.edges).toEqual([]);
  });
});
