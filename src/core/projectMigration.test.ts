import { describe, expect, it } from "vitest";
import { createStarterProject } from "./project";
import { loadProject } from "./projectMigration";

function createLegacyV1Fixture() {
  const current = createStarterProject();
  const { chapters: _chapters, defaultChapterId: _defaultChapterId, ...legacy } = structuredClone(current);
  return {
    ...legacy,
    schemaVersion: 1,
    nodes: legacy.nodes.map(({ chapterId: _chapterId, ...node }) => node),
  };
}

function createLegacyV2Fixture() {
  const current = createStarterProject();
  const { chapters: _chapters, defaultChapterId: _defaultChapterId, ...legacy } = structuredClone(current);
  return {
    ...legacy,
    schemaVersion: 2,
    nodes: [
      ...legacy.nodes.map(({ chapterId: _chapterId, ...node }) => node),
      { id: "chapter-2", kind: "chapter", title: "Chapter anchor", position: { x: 900, y: 100 }, chapterId: "chapter-2" },
      { id: "legacy-jump", kind: "jump", title: "Legacy jump", position: { x: 700, y: 100 }, chapterId: "chapter-2" },
    ],
  };
}

describe("project migration", () => {
  it("migrates v1 without changing stable ids or graph positions", () => {
    const legacy = createLegacyV1Fixture();
    const migrated = loadProject(legacy);
    expect(migrated.schemaVersion).toBe(3);
    expect(migrated.nodes.map(node => [node.id, node.position]))
      .toEqual(legacy.nodes.map(node => [node.id, node.position]));
    expect(migrated.edges).toEqual(legacy.edges);
  });

  it("does not mutate the imported project", () => {
    const legacy = createLegacyV1Fixture();
    const before = structuredClone(legacy);
    loadProject(legacy);
    expect(legacy).toEqual(before);
  });

  it("loads current projects without migration", () => {
    const current = createStarterProject();
    expect(loadProject(current)).toEqual(current);
  });

  it("migrates v2 nodes into the default chapter without changing graph identity", () => {
    const legacy = createLegacyV2Fixture();
    const migrated = loadProject(legacy);
    expect(migrated.schemaVersion).toBe(3);
    expect(migrated.chapters).toEqual([{ id: "main-story", name: "主剧情", order: 0, entryNodeId: "start" }]);
    expect(migrated.nodes.every(node => node.chapterId === "main-story")).toBe(true);
    expect(migrated.nodes.map(node => [node.id, node.position])).toEqual(legacy.nodes.map(node => [node.id, node.position]));
    expect(migrated.edges).toEqual(legacy.edges);
  });

  it("preserves v2 jump semantics as an anchor target", () => {
    const jump = loadProject(createLegacyV2Fixture()).nodes.find(node => node.id === "legacy-jump");
    expect(jump).toMatchObject({ kind: "jump", targetType: "anchor", targetId: "chapter-2", chapterId: "main-story" });
  });

  it("rejects unknown project versions clearly", () => {
    expect(() => loadProject({ schemaVersion: 99 })).toThrow("不支持的项目格式版本：99");
  });
});
