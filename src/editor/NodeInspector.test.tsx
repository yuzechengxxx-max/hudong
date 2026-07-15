import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createNode, createStarterProject } from "../core/project";
import { NodeInspector } from "./NodeInspector";

describe("NodeInspector", () => {
  it("only offers operations compatible with the selected variable type", () => {
    const project = createStarterProject();
    const variableNode = createNode("setVariable", 1);
    if (variableNode.kind !== "setVariable") throw new Error("fixture");
    project.nodes.push({ ...variableNode, id: "set-score", variableId: "affection" });
    render(<NodeInspector project={project} selectedId="set-score" onChange={() => {}}/>);
    expect(screen.getByRole("option", { name: "增加" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "乘以" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "追加文本" })).not.toBeInTheDocument();
  });

  it("removing a random branch removes its connected edge atomically", async () => {
    const project = createStarterProject();
    const random = createNode("random", 1);
    if (random.kind !== "random") throw new Error("fixture");
    project.nodes.push({ ...random, id: "random-1", branches: [...random.branches, { id: "branch-c", label: "分支三", weight: 1 }] });
    project.edges.push({ id: "branch-edge", source: "random-1", sourcePort: "branch-b", target: "ending" });
    const onChange = vi.fn();
    render(<NodeInspector project={project} selectedId="random-1" onChange={onChange}/>);
    await userEvent.click(screen.getByRole("button", { name: "删除分支 分支二" }));
    const next = onChange.mock.calls[0][0];
    expect(next.nodes.find((node: { id: string }) => node.id === "random-1").branches).toHaveLength(2);
    expect(next.edges).not.toContainEqual(expect.objectContaining({ id: "branch-edge" }));
  });

  it("edits timed-choice duration in seconds while storing milliseconds", async () => {
    const project = createStarterProject();
    project.nodes.push({ ...createNode("timedChoice", 1), id: "urgent" });
    const onChange = vi.fn();
    render(<NodeInspector project={project} selectedId="urgent" onChange={onChange}/>);
    const duration = screen.getByLabelText("选择时限（秒）");
    fireEvent.change(duration, { target: { value: "8" } });
    const latest = onChange.mock.calls.at(-1)?.[0];
    expect(latest.nodes.find((node: { id: string }) => node.id === "urgent").durationMs).toBe(8000);
  });

  it("only lists audio assets for music nodes", () => {
    const project = createStarterProject();
    project.assets.push(
      { id: "poster", name: "海报", type: "image/png", size: 1, url: "poster.png" },
      { id: "bgm", name: "主题音乐", type: "audio/mpeg", size: 1, url: "bgm.mp3" },
    );
    project.nodes.push({ ...createNode("music", 1), id: "music" });
    render(<NodeInspector project={project} selectedId="music" onChange={() => {}}/>);
    expect(screen.getByRole("option", { name: "主题音乐" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "海报" })).not.toBeInTheDocument();
  });
});
