import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RecoveryPanel } from "./RecoveryPanel";

describe("RecoveryPanel", () => {
  it("shows recovery summaries and restores a selected point", async () => {
    const onRestore = vi.fn();
    render(<RecoveryPanel points={[{ id: "one", createdAt: "2026-07-15T10:30:00.000Z", reason: "manual", nodeCount: 30, chapterCount: 3 }]} onRestore={onRestore}/>);
    expect(screen.getByText("手动保存")).toBeVisible();
    expect(screen.getByText("3 章 · 30 节点")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "恢复此版本" }));
    expect(onRestore).toHaveBeenCalledWith("one");
  });
});
