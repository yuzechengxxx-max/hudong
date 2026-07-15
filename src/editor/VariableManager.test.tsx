import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createStarterProject } from "../core/project";
import { VariableManager } from "./VariableManager";

describe("VariableManager", () => {
  it("searches, edits, and reports references", async () => {
    const project = createStarterProject();
    project.nodes.push({ id: "set-affection", kind: "setVariable", title: "增加好感", position: { x: 0, y: 0 }, chapterId: "main-story", variableId: "affection", operation: "add", value: 1 });
    const onChange = vi.fn();
    const onNavigate = vi.fn();
    render(<VariableManager project={project} onChange={onChange} onNavigate={onNavigate} onAdd={vi.fn()}/>);
    expect(screen.getByRole("button", { name: "定位 林夏好感度 的 1 个引用" })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "定位 林夏好感度 的 1 个引用" }));
    expect(onNavigate).toHaveBeenCalledWith("set-affection", "main-story");
    const name = screen.getByLabelText("变量名称 林夏好感度");
    await userEvent.clear(name);
    await userEvent.type(name, "好感度");
    expect(onChange).toHaveBeenCalled();
    await userEvent.type(screen.getByRole("searchbox", { name: "搜索变量" }), "不存在");
    expect(screen.getByText("没有符合条件的变量")).toBeVisible();
  });

  it("blocks an incompatible type change with visible locations", async () => {
    const project = createStarterProject();
    project.nodes.push({ id: "set-affection", kind: "setVariable", title: "增加好感", position: { x: 0, y: 0 }, chapterId: "main-story", variableId: "affection", operation: "add", value: 1 });
    render(<VariableManager project={project} onChange={vi.fn()} onNavigate={vi.fn()} onAdd={vi.fn()}/>);
    await userEvent.selectOptions(screen.getByLabelText("变量类型 林夏好感度"), "string");
    expect(screen.getByText("1 个引用与文本类型不兼容")).toBeVisible();
  });
});
