import { describe, expect, it } from "vitest";
import { createStarterProject } from "../core/project";
import { createMemoryProjectRepository } from "./projectRepository";

describe("project repository", () => {
  it("saves and validates the current project", async () => {
    const repository = createMemoryProjectRepository();
    const project = createStarterProject();
    project.title = "已保存项目";
    await repository.saveCurrent(project);
    expect((await repository.loadCurrent())?.title).toBe("已保存项目");
  });

  it("lists recovery points newest first with project summaries", async () => {
    const repository = createMemoryProjectRepository();
    const project = createStarterProject();
    await repository.createRecovery(project, "interval", new Date("2026-07-15T10:00:00Z"));
    project.title = "手动版本";
    await repository.createRecovery(project, "manual", new Date("2026-07-15T11:00:00Z"));
    const points = await repository.listRecoveries();
    expect(points.map(point => point.reason)).toEqual(["manual", "interval"]);
    expect(points[0]).toMatchObject({ nodeCount: 4, chapterCount: 1 });
    expect((await repository.loadRecovery(points[0].id)).title).toBe("手动版本");
  });

  it("keeps at most ten points and prunes automatic points before manual points", async () => {
    const repository = createMemoryProjectRepository();
    const project = createStarterProject();
    for (let index = 0; index < 8; index += 1) await repository.createRecovery(project, "manual", new Date(1000 + index));
    for (let index = 0; index < 5; index += 1) await repository.createRecovery(project, "interval", new Date(2000 + index));
    const points = await repository.listRecoveries();
    expect(points).toHaveLength(10);
    expect(points.filter(point => point.reason === "manual")).toHaveLength(8);
  });

  it("returns defensive copies", async () => {
    const repository = createMemoryProjectRepository();
    const project = createStarterProject();
    await repository.saveCurrent(project);
    const loaded = await repository.loadCurrent();
    loaded!.title = "mutated";
    expect((await repository.loadCurrent())?.title).toBe(project.title);
  });
});
