import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("editor workbench", () => {
  it("selects a node and edits its title in the inspector", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "要不要赴约？" }));
    const title = screen.getByLabelText("节点名称");
    await userEvent.clear(title);
    await userEvent.type(title, "是否进入仓库");
    expect(screen.getByRole("button", { name: "是否进入仓库" })).toBeVisible();
  });

  it("previews a branch choice", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "继续剧情" }));
    await userEvent.click(screen.getByRole("button", { name: "前往旧仓库" }));
    expect(screen.getByRole("heading", { name: "未完的来信" })).toBeVisible();
  });

  it("adds and deletes a real choice node", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "添加玩家选择" }));
    expect(screen.getByRole("button", { name: "新选择" })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "删除选中节点" }));
    expect(screen.queryByRole("button", { name: "新选择" })).not.toBeInTheDocument();
  });

  it("saves edits to browser storage", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "要不要赴约？" }));
    const title = screen.getByLabelText("节点名称");
    await userEvent.clear(title);
    await userEvent.type(title, "保存后的选择");
    await userEvent.click(screen.getByRole("button", { name: "保存项目" }));
    expect(localStorage.getItem("flowfilm-project")).toContain("保存后的选择");
  });
});
