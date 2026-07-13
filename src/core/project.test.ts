import { describe, expect, it } from "vitest";
import { ProjectSchema, createStarterProject } from "./project";

describe("ProjectSchema", () => {
  it("accepts a starter project", () => {
    expect(ProjectSchema.parse(createStarterProject()).schemaVersion).toBe(1);
  });

  it("rejects incomplete edges", () => {
    const invalid = { ...createStarterProject(), edges: [{ id: "edge-1" }] };
    expect(() => ProjectSchema.parse(invalid)).toThrow();
  });
});
