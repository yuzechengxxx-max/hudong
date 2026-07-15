import { describe, expect, it } from "vitest";
import { createStarterProject, type Project } from "../core/project";
import { createChapter, deleteChapter, duplicateChapter, renameChapter, reorderChapter } from "./chapterCommands";

function chapterFixture(): Project {
  const project = createStarterProject();
  project.chapters.push({ id: "chapter-2", name: "Chapter Two", order: 1, entryNodeId: "chapter-2-start" });
  project.nodes.push(
    { id: "chapter-2-start", kind: "start", title: "Start two", position: { x: 0, y: 0 }, chapterId: "chapter-2" },
    { id: "chapter-2-choice", kind: "choice", title: "Choice two", position: { x: 200, y: 0 }, chapterId: "chapter-2", prompt: "Choose", choices: [{ id: "choice-a", label: "A" }] },
    { id: "chapter-2-ending", kind: "ending", title: "Ending two", position: { x: 400, y: 0 }, chapterId: "chapter-2", endingTitle: "Done" },
    { id: "jump-to-two", kind: "jump", title: "Jump", position: { x: 0, y: 300 }, chapterId: "main-story", targetType: "chapter", targetId: "chapter-2" },
  );
  project.edges.push(
    { id: "chapter-2-edge-a", source: "chapter-2-start", sourcePort: "next", target: "chapter-2-choice" },
    { id: "chapter-2-edge-b", source: "chapter-2-choice", sourcePort: "choice-a", target: "chapter-2-ending" },
  );
  return project;
}

describe("chapter commands", () => {
  it("creates, renames, and reorders chapters immutably", () => {
    const original = chapterFixture();
    const created = createChapter(original, "Finale", "finale");
    const renamed = renameChapter(created.project, created.chapterId, "Final Chapter");
    const reordered = reorderChapter(renamed, created.chapterId, "up");
    expect(original.chapters).toHaveLength(2);
    expect(renamed.chapters.find(chapter => chapter.id === created.chapterId)?.name).toBe("Final Chapter");
    expect(reordered.chapters.find(chapter => chapter.id === created.chapterId)?.order).toBe(1);
  });

  it("duplicates a chapter with remapped internal graph ids", () => {
    const result = duplicateChapter(chapterFixture(), "chapter-2", "seed");
    const copy = result.chapters.find(chapter => chapter.id === "chapter-seed");
    const copiedNodes = result.nodes.filter(node => node.chapterId === copy?.id);
    expect(copiedNodes).toHaveLength(3);
    expect(new Set(copiedNodes.map(node => node.id)).size).toBe(3);
    expect(result.edges.filter(edge => copiedNodes.some(node => node.id === edge.source))).toHaveLength(2);
    expect(copy?.entryNodeId).toBe("chapter-2-start-seed");
  });

  it("deletes a non-empty chapter but preserves broken jumps for diagnostics", () => {
    const result = deleteChapter(chapterFixture(), "chapter-2");
    expect(result.nodes.some(node => node.chapterId === "chapter-2")).toBe(false);
    expect(result.nodes).toContainEqual(expect.objectContaining({ kind: "jump", targetId: "chapter-2" }));
    expect(result.edges.some(edge => edge.source.startsWith("chapter-2"))).toBe(false);
  });

  it("rejects deletion of the default chapter", () => {
    expect(() => deleteChapter(chapterFixture(), "main-story")).toThrow("default chapter");
  });
});
