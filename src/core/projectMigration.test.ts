import { describe, expect, it } from "vitest";
import { createStarterProject } from "./project";
import { loadProject } from "./projectMigration";

function createLegacyV1Fixture() {
  const current = createStarterProject();
  return { ...structuredClone(current), schemaVersion: 1 };
}

describe("project migration", () => {
  it("migrates v1 without changing stable ids or graph positions", () => {
    const legacy = createLegacyV1Fixture();
    const migrated = loadProject(legacy);
    expect(migrated.schemaVersion).toBe(2);
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

  it("rejects unknown project versions clearly", () => {
    expect(() => loadProject({ schemaVersion: 99 })).toThrow("不支持的项目格式版本：99");
  });
});
