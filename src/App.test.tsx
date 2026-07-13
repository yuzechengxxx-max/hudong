import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App, createPlayableHtml } from "./App";
import { createStarterProject } from "./core/project";

describe("editor workbench", () => {
  it("selects a node and edits its title in the inspector", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "要不要赴约？" }));
    const title = screen.getByLabelText("节点名称");
    await userEvent.clear(title);
    await userEvent.type(title, "是否进入仓库");
    expect(screen.getByRole("button", { name: "是否进入仓库" })).toBeVisible();
  });

  it("previews a branch choice", async () => {
    render(<App />);
    expect(screen.queryByRole("button", { name: "预览" })).not.toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: "要不要赴约？" }));
    const title = screen.getByLabelText("节点名称");
    await userEvent.clear(title);
    await userEvent.type(title, "保存后的选择");
    await userEvent.click(screen.getByRole("button", { name: "保存项目" }));
    expect(localStorage.getItem("flowfilm-project")).toContain("保存后的选择");
  });

  it("creates a scene and connects the selected node", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "视频场景" }));
    expect(screen.getByRole("button", { name: "新场景" })).toBeVisible();
    await userEvent.selectOptions(screen.getByLabelText("连接到"), "ending");
    expect(screen.getByText("已连接到：黎明之前")).toBeVisible();
  });

  it("switches to assets and registers an uploaded file", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "素材" }));
    const input = screen.getByLabelText("导入素材");
    await userEvent.upload(input, new File(["video"], "scene.mp4", { type: "video/mp4" }));
    expect(screen.getByText("scene.mp4")).toBeVisible();
  });

  it("provides a real graph canvas and resizable work areas", () => {
    const { container } = render(<App />);
    expect(screen.getByTestId("story-graph")).toBeVisible();
    expect(screen.getAllByRole("separator").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTitle("Fit view")).toBeVisible();
    expect(container.querySelector(".graph-node-body")).not.toHaveClass("nodrag");
    expect(container.querySelector(".react-flow__minimap")).toHaveStyle({ width: "140px", height: "96px" });
    expect(container.querySelector(".react-flow__edge-default")).toBeInTheDocument();
  });

  it("keeps the timeline collapsed until requested", async () => {
    render(<App />);
    expect(screen.queryByTestId("timeline-drawer")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "演出时间线" }));
    expect(screen.getByTestId("timeline-drawer")).toBeVisible();
  });

  it("adds, reorders, and removes choice options with their edges", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "添加选项" }));
    expect(screen.getByLabelText("选项 3")).toHaveValue("新选项 3");
    await userEvent.click(screen.getByRole("button", { name: "上移选项 新选项 3" }));
    expect(screen.getByLabelText("选项 2")).toHaveValue("新选项 3");
    await userEvent.click(screen.getByRole("button", { name: "删除选项 前往旧仓库" }));
    await userEvent.click(screen.getByRole("button", { name: "保存项目" }));
    const saved = JSON.parse(localStorage.getItem("flowfilm-project") ?? "{}");
    expect(saved.edges.some((edge: { sourcePort: string }) => edge.sourcePort === "warehouse")).toBe(false);
  });

  it("toggles the visual-novel dialogue box per scene", async () => {
    const { container } = render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "雨夜码头" }));
    const toggle = screen.getByRole("checkbox", { name: "显示对话框" });
    expect(toggle).not.toBeChecked();
    expect(screen.queryByLabelText("角色")).not.toBeInTheDocument();
    expect(container.querySelector(".dialogue-box")).not.toBeInTheDocument();
    expect(container.querySelector(".scene-continue")).toBeInTheDocument();
    await userEvent.click(toggle);
    expect(screen.getByLabelText("角色")).toBeVisible();
    expect(screen.getByLabelText("对白")).toBeVisible();
    expect(container.querySelector(".dialogue-box")).toBeInTheDocument();
  });

  it("exports dialogue and video-ended scene behavior", () => {
    const html = createPlayableHtml(createStarterProject());
    expect(html).toContain("n.showDialogue");
    expect(html).toContain("video.onended");
  });
});
