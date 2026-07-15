import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createStarterProject, type Project } from "../core/project";
import { createMemoryProjectRepository } from "./projectRepository";
import { useProjectPersistence } from "./useProjectPersistence";

afterEach(() => vi.useRealTimers());

describe("useProjectPersistence", () => {
  it("debounces automatic saves for 800 ms", async () => {
    vi.useFakeTimers();
    const repository = createMemoryProjectRepository();
    const starter = createStarterProject();
    const renamed = { ...starter, title: "重命名项目" };
    const { rerender } = renderHook(({ project }) => useProjectPersistence(project, repository), { initialProps: { project: starter } });
    rerender({ project: renamed });
    await act(() => vi.advanceTimersByTimeAsync(799));
    expect((await repository.loadCurrent())?.title).not.toBe("重命名项目");
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect((await repository.loadCurrent())?.title).toBe("重命名项目");
  });

  it("creates a manual recovery point and exposes saved state", async () => {
    const repository = createMemoryProjectRepository();
    const project = createStarterProject();
    const { result } = renderHook(() => useProjectPersistence(project, repository));
    await act(() => result.current.manualSave());
    expect(result.current.status).toBe("saved");
    expect(result.current.recoveries[0]?.reason).toBe("manual");
  });

  it("creates a pre-restore point and returns the recovered project as dirty", async () => {
    const repository = createMemoryProjectRepository();
    const old = createStarterProject();
    old.title = "旧版本";
    const point = await repository.createRecovery(old, "manual");
    const current = createStarterProject();
    current.title = "当前版本";
    const { result } = renderHook(() => useProjectPersistence(current, repository));
    let recovered: Project | undefined;
    await act(async () => { recovered = await result.current.restore(point.id); });
    expect(recovered?.title).toBe("旧版本");
    expect(result.current.status).toBe("dirty");
    expect(result.current.recoveries.some(item => item.reason === "pre-restore")).toBe(true);
  });
});
