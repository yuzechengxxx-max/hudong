import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NodeCreateMenu } from "./NodeCreateMenu";

describe("NodeCreateMenu", () => {
  it("filters by Chinese label and creates at the requested graph position", async () => {
    const onCreate = vi.fn();
    render(<NodeCreateMenu position={{ x: 80, y: 90 }} graphPosition={{ x: 420, y: 260 }} onCreate={onCreate} onClose={() => {}}/>);
    await userEvent.type(screen.getByRole("searchbox", { name: "搜索节点" }), "随机");
    expect(screen.queryByRole("button", { name: /视频场景/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /随机分支/ }));
    expect(onCreate).toHaveBeenCalledWith("random", 420, 260);
  });

  it("matches search aliases and shows categories", async () => {
    render(<NodeCreateMenu position={{ x: 0, y: 0 }} graphPosition={{ x: 0, y: 0 }} onCreate={() => {}} onClose={() => {}}/>);
    expect(screen.getByText("互动")).toBeVisible();
    expect(screen.getByText("逻辑")).toBeVisible();
    await userEvent.type(screen.getByRole("searchbox", { name: "搜索节点" }), "BGM");
    expect(screen.getByRole("button", { name: /音乐控制/ })).toBeVisible();
  });

  it("supports arrow navigation and Enter creation", async () => {
    const onCreate = vi.fn();
    render(<NodeCreateMenu position={{ x: 20, y: 30 }} graphPosition={{ x: 100, y: 120 }} onCreate={onCreate} onClose={() => {}}/>);
    const search = screen.getByRole("searchbox", { name: "搜索节点" });
    await userEvent.type(search, "选择");
    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(onCreate).toHaveBeenCalledWith("timedChoice", 100, 120);
  });

  it("closes with Escape", async () => {
    const onClose = vi.fn();
    render(<NodeCreateMenu position={{ x: 20, y: 30 }} graphPosition={{ x: 100, y: 120 }} onCreate={() => {}} onClose={onClose}/>);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
