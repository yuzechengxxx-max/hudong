import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createStarterProject } from "../core/project";
import { ChapterManager } from "./ChapterManager";

describe("ChapterManager", () => {
  it("shows chapter counts and switches the active chapter", async () => {
    const project = createStarterProject();
    project.chapters.push({ id: "chapter-two", name: "第二章", order: 1, entryNodeId: "chapter-two-start" });
    project.nodes.push({ id: "chapter-two-start", kind: "start", title: "第二章开始", position: { x: 0, y: 0 }, chapterId: "chapter-two" });
    const onSelect = vi.fn();
    render(<ChapterManager project={project} activeChapterId="main-story" issueCounts={{ "chapter-two": 2 }} onSelect={onSelect} onCreate={vi.fn()} onRename={vi.fn()} onDuplicate={vi.fn()} onReorder={vi.fn()} onDelete={vi.fn()}/>);
    expect(screen.getByText("4 个节点")).toBeVisible();
    expect(screen.getByText("2 个问题")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "打开章节 第二章" }));
    expect(onSelect).toHaveBeenCalledWith("chapter-two");
  });
});
