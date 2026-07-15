import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App, createPlayableHtml } from "./App";
import { createStarterProject } from "./core/project";
import { createLargeProject } from "./test/largeProject";

describe("editor workbench", () => {
  async function createNodeFromCanvas(container: HTMLElement, name: string) {
    const pane = container.querySelector(".react-flow__pane");
    expect(pane).toBeInTheDocument();
    fireEvent.doubleClick(pane!, { clientX: 420, clientY: 260 });
    await userEvent.click(screen.getByRole("button", { name }));
  }

  it("switches independent chapter canvases from the project drawer", async () => {
    const project = createStarterProject();
    project.chapters.push({ id: "chapter-two", name: "第二章", order: 1, entryNodeId: "chapter-two-start" });
    project.nodes.push({ id: "chapter-two-start", kind: "start", title: "第二章开始", position: { x: 0, y: 0 }, chapterId: "chapter-two" });
    localStorage.setItem("flowfilm-project", JSON.stringify(project));
    render(<App/>);
    await userEvent.click(screen.getByRole("button", { name: "打开项目" }));
    await userEvent.click(screen.getByRole("button", { name: "打开章节 第二章" }));
    expect(screen.getByTestId("story-graph")).toHaveAttribute("data-chapter-id", "chapter-two");
    expect(screen.getByText(`${project.title} / 第二章`)).toBeVisible();
  });

  it("renders the glass workbench shell around the graph", () => {
    render(<App />);
    expect(screen.getByTestId("tool-island")).toBeVisible();
    expect(screen.getByRole("navigation", { name: "工作区" })).toBeVisible();
    expect(screen.getByTestId("status-float")).toBeVisible();
    expect(screen.getByTestId("story-graph")).toBeVisible();
  });

  it("exposes node kinds for neutral typed node chrome", () => {
    const { container } = render(<App />);
    expect(container.querySelector(".graph-node[data-kind='choice']")).toBeInTheDocument();
  });

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

  it("shows and skips a wait interaction", async () => {
    const project = createStarterProject();
    project.nodes = [
      { id: "start", kind: "start", title: "开始", position: { x: 0, y: 0 }, chapterId: "main-story" },
      { id: "wait", kind: "wait", title: "等待", position: { x: 100, y: 0 }, chapterId: "main-story", durationMs: 2000 },
      { id: "after", kind: "scene", title: "等待后的场景", position: { x: 200, y: 0 }, chapterId: "main-story", mediaUrl: "", speaker: "", dialogue: "", showDialogue: false },
    ];
    project.edges = [
      { id: "a", source: "start", sourcePort: "next", target: "wait" },
      { id: "b", source: "wait", sourcePort: "next", target: "after" },
    ];
    localStorage.setItem("flowfilm-project", JSON.stringify(project));
    render(<App/>);
    expect(screen.getAllByText("等待 2 秒").length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("button", { name: "跳过等待" }));
    expect(screen.getByRole("button", { name: "继续剧情" })).toBeVisible();
  });

  it("adds and deletes a real choice node", async () => {
    const { container } = render(<App />);
    await createNodeFromCanvas(container, "玩家选择");
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
    const { container } = render(<App />);
    await createNodeFromCanvas(container, "视频场景");
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

  it("shows visual asset previews and a resizable asset drawer", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "素材" }));
    const input = screen.getByLabelText("导入素材");
    await userEvent.upload(input, new File(["image"], "poster.png", { type: "image/png" }));
    expect(await screen.findByRole("img", { name: "poster.png" })).toBeVisible();
    expect(screen.getByRole("separator", { name: "调整素材面板宽度" })).toBeVisible();
    expect(screen.getByPlaceholderText("搜索素材")).toBeVisible();
  });

  it("drags an asset onto a scene node and shows its thumbnail", async () => {
    const { container } = render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "素材" }));
    await userEvent.upload(screen.getByLabelText("导入素材"), new File(["image"], "scene-art.png", { type: "image/png" }));
    const assetCard = (await screen.findByRole("img", { name: "scene-art.png" })).closest(".asset-card");
    const data = new Map<string, string>();
    const dataTransfer = { setData: (type: string, value: string) => data.set(type, value), getData: (type: string) => data.get(type) ?? "", types: ["application/x-flowfilm-asset"] };
    fireEvent.dragStart(assetCard!, { dataTransfer });
    const sceneNode = container.querySelector('[data-testid="rf__node-opening"]');
    fireEvent.dragOver(sceneNode!, { dataTransfer });
    fireEvent.drop(sceneNode!, { dataTransfer, clientX: 360, clientY: 220 });
    expect(sceneNode?.querySelector('img[alt="scene-art.png"]')).toBeVisible();
  });

  it("clears node selection when the blank canvas is clicked", async () => {
    const { container } = render(<App />);
    expect(screen.getByLabelText("节点名称")).toBeVisible();
    const pane = container.querySelector(".react-flow__pane");
    expect(pane).toBeInTheDocument();
    fireEvent.click(pane!);
    expect(screen.getByText("未选择节点")).toBeVisible();
  });

  it("does not clear a selection when a marquee drag ends on the pane", () => {
    const { container } = render(<App />);
    const pane = container.querySelector(".react-flow__pane");
    expect(pane).toBeInTheDocument();
    fireEvent.mouseDown(pane!, { clientX: 120, clientY: 120 });
    fireEvent.mouseMove(pane!, { clientX: 260, clientY: 240 });
    fireEvent.mouseUp(pane!, { clientX: 260, clientY: 240 });
    fireEvent.click(screen.getByRole("button", { name: "黎明之前" }));
    fireEvent.click(pane!);
    expect(container.querySelectorAll(".react-flow__node.selected")).toHaveLength(1);
    expect(screen.getByLabelText("节点名称")).toHaveValue("黎明之前");
  });

  it("opens assets and project tools as temporary drawers", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "素材" }));
    expect(screen.getByLabelText("导入素材")).toBeInTheDocument();
    expect(screen.getByText("导入视频、图片、音乐或音效，再在场景节点中选择使用。")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "项目" }));
    expect(screen.getByRole("button", { name: "导出项目文件" })).toBeVisible();
  });

  it("provides movable preview window controls", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: "重置预览位置" })).toBeVisible();
    expect(screen.getByRole("button", { name: "收起预览" })).toBeVisible();
    expect(screen.getByRole("separator", { name: "调整预览大小" })).toBeVisible();
  });

  it("migrates the preview away from editor chrome", () => {
    localStorage.setItem("flowfilm-preview-position", JSON.stringify({ x: 12, y: 12 }));
    const { container } = render(<App />);
    expect(container.querySelector(".floating-preview")).toHaveStyle({ left: "76px", top: "76px" });
  });

  it("selects all nodes and clears the selection with editor shortcuts", () => {
    const { container } = render(<App />);
    fireEvent.keyDown(window, { key: "a", ctrlKey: true });
    expect(container.querySelectorAll(".react-flow__node.selected")).toHaveLength(4);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(container.querySelectorAll(".react-flow__node.selected")).toHaveLength(0);
    expect(screen.getByText("未选择节点")).toBeVisible();
  });

  it("duplicates selected nodes and can undo the transaction", () => {
    render(<App />);
    fireEvent.keyDown(window, { key: "d", ctrlKey: true });
    expect(screen.getByRole("button", { name: "要不要赴约？ 副本" })).toBeVisible();
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(screen.queryByRole("button", { name: "要不要赴约？ 副本" })).not.toBeInTheDocument();
  });

  it("does not run canvas shortcuts while editing text", async () => {
    const { container } = render(<App />);
    const title = screen.getByLabelText("节点名称");
    await userEvent.click(title);
    fireEvent.keyDown(title, { key: "a", ctrlKey: true });
    expect(container.querySelectorAll(".react-flow__node.selected")).toHaveLength(1);
  });

  it("adds and removes individual nodes from a multi-selection with Shift", () => {
    const { container } = render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "黎明之前" }), { shiftKey: true });
    expect(container.querySelectorAll(".react-flow__node.selected")).toHaveLength(2);
    expect(screen.getByLabelText("节点名称")).toHaveValue("黎明之前");
    fireEvent.click(screen.getByRole("button", { name: "要不要赴约？" }), { shiftKey: true });
    expect(container.querySelectorAll(".react-flow__node.selected")).toHaveLength(1);
  });

  it("adds marquee hits to the existing selection while Shift is held", () => {
    const { container } = render(<App />);
    const pane = container.querySelector(".react-flow__pane");
    const graph = screen.getByTestId("story-graph");
    fireEvent.pointerDown(pane!, { clientX: 120, clientY: 120, shiftKey: true });
    fireEvent.pointerMove(pane!, { clientX: 260, clientY: 240, shiftKey: true });
    fireEvent(graph, new CustomEvent("flowfilm:selection-end", { detail: { ids: ["ending"], initialIds: ["choice"], additive: true } }));
    expect(container.querySelectorAll(".react-flow__node.selected")).toHaveLength(2);
  });

  it("toggles the minimap and remembers the editor preference", async () => {
    render(<App />);
    expect(screen.getByTestId("graph-minimap")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "隐藏小地图" }));
    expect(screen.queryByTestId("graph-minimap")).not.toBeInTheDocument();
    expect(localStorage.getItem("flowfilm-minimap-visible")).toBe("false");
  });

  it("copies and pastes the current node selection", () => {
    render(<App />);
    fireEvent.keyDown(window, { key: "c", ctrlKey: true });
    fireEvent.keyDown(window, { key: "v", ctrlKey: true });
    expect(screen.getByRole("button", { name: "要不要赴约？ 副本" })).toBeVisible();
  });

  it("keeps undo and redo on shortcuts without toolbar buttons", () => {
    render(<App />);
    expect(screen.queryByRole("button", { name: "撤销" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "重做" })).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: "d", ctrlKey: true });
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    fireEvent.keyDown(window, { key: "y", ctrlKey: true });
    expect(screen.getByRole("button", { name: "要不要赴约？ 副本" })).toBeVisible();
  });

  it("shows a clear status after a manual save", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "保存项目" }));
    expect(screen.getByText("已保存 · 刚刚")).toBeVisible();
  });

  it("exposes save state on the save control", async () => {
    render(<App />);
    const save = screen.getByRole("button", { name: "保存项目" });
    await userEvent.click(save);
    expect(save).toHaveAttribute("data-state", "saved");
    expect(save).toHaveTextContent("已保存");
  });

  it("edits project display and UI settings from the settings drawer", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "项目设置" }));
    await userEvent.selectOptions(screen.getByLabelText("画面比例"), "21:9");
    const width = screen.getByLabelText("输出宽度");
    await userEvent.clear(width);
    await userEvent.type(width, "2560");
    expect(width).toHaveValue(2560);
    expect(screen.getByRole("group", { name: "编辑器主题" })).toBeVisible();
    expect(screen.getByRole("button", { name: "自动" })).toBeVisible();
    expect(screen.getByTestId("preview-stage")).toHaveStyle({ aspectRatio: "21 / 9" });
  });

  it("switches editor themes and persists the preference", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "项目设置" }));
    await userEvent.click(screen.getByRole("button", { name: "浅色" }));
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(localStorage.getItem("flowfilm-editor-theme")).toBe("light");
  });

  it("renders media previews as complete thumbnails", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "素材" }));
    await userEvent.upload(screen.getByLabelText("导入素材"), new File(["image"], "wide-scene.png", { type: "image/png" }));
    expect(await screen.findByRole("img", { name: "wide-scene.png" })).toHaveClass("contain-media");
  });

  it("provides a real graph canvas and resizable work areas", () => {
    const { container } = render(<App />);
    expect(screen.getByTestId("story-graph")).toBeVisible();
    expect(screen.getAllByRole("separator").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTitle("Fit view")).toBeVisible();
    expect(container.querySelector(".graph-node-body")).not.toHaveClass("nodrag");
    expect(container.querySelector(".react-flow__minimap")).toHaveStyle({ width: "140px", height: "96px" });
    expect(container.querySelector(".react-flow__edge-default")).toBeInTheDocument();
    expect(container.querySelector(".react-flow__background")).toHaveStyle({ "--xy-background-pattern-color-props": "var(--ff-canvas-dot)" });
  });

  it("keeps floating panels resizable without occupying canvas columns", async () => {
    const { container } = render(<App />);
    expect(container.querySelector(".work-area")).toHaveAttribute("data-layout", "canvas-only");
    expect(screen.getByRole("separator", { name: "调整属性面板大小" })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "素材" }));
    expect(screen.getByRole("separator", { name: "调整素材面板宽度" })).toBeVisible();
  });

  it("places the minimap toggle with the minimap", () => {
    render(<App />);
    expect(screen.getByTestId("graph-minimap")).toContainElement(screen.getByRole("button", { name: "隐藏小地图" }));
  });

  it("keeps minimap commands on the canvas right and inspector resizing on the left", async () => {
    const { container } = render(<App />);
    expect(screen.getByRole("button", { name: "隐藏小地图" })).toHaveClass("minimap-toggle");
    expect(screen.getByRole("separator", { name: "调整属性面板大小" }).closest(".inspector-float")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "隐藏小地图" }));
    expect(screen.getByRole("button", { name: "显示小地图" })).toHaveClass("minimap-toggle");
    expect(container.querySelector(".graph-toolbar .minimap-toggle")).not.toBeInTheDocument();
  });

  it("toggles the canvas dot grid independently from the minimap", async () => {
    render(<App />);
    const toggle = screen.getByRole("button", { name: "隐藏点阵" });
    expect(toggle).toBeEnabled();
    await userEvent.click(toggle);
    expect(screen.getByRole("button", { name: "显示点阵" })).toBeEnabled();
  });

  it("renders a 300-node project without losing graph controls", () => {
    localStorage.setItem("flowfilm-project", JSON.stringify(createLargeProject(300)));
    render(<App />);
    expect(screen.getByText("300 个节点")).toBeVisible();
    expect(screen.getByRole("button", { name: "适应视图" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "隐藏小地图" })).toBeEnabled();
  }, 15000);

  it("deletes a selected connection with the Delete key", () => {
    const { container } = render(<App />);
    const edge = container.querySelector('[data-testid="rf__edge-e-opening"]');
    expect(edge).toBeInTheDocument();
    fireEvent.click(edge!);
    fireEvent.keyDown(edge!, { key: "Delete" });
    expect(container.querySelector('[data-testid="rf__edge-e-opening"]')).not.toBeInTheDocument();
  });

  it("disconnects an edge from its context menu", async () => {
    const { container } = render(<App />);
    const edge = container.querySelector('[data-testid="rf__edge-e-opening"]');
    expect(edge).toBeInTheDocument();
    fireEvent.contextMenu(edge!, { clientX: 360, clientY: 220 });
    await userEvent.click(screen.getByRole("button", { name: "断开连接" }));
    expect(container.querySelector('[data-testid="rf__edge-e-opening"]')).not.toBeInTheDocument();
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
