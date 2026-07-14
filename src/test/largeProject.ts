import { createStarterProject, type Project, type StoryNode } from "../core/project";

export function createLargeProject(count: number): Project {
  const base = createStarterProject();
  const nodes: StoryNode[] = [{ id: "start", kind: "start", title: "故事入口", position: { x: 0, y: 0 } }];
  for (let index = 1; index < count; index += 1) {
    nodes.push({
      id: `scene-${index}`,
      kind: "scene",
      title: `场景 ${index}`,
      position: { x: (index % 20) * 240, y: Math.floor(index / 20) * 170 },
      mediaUrl: "",
      speaker: "",
      dialogue: "",
      showDialogue: false,
    });
  }
  return {
    ...base,
    nodes,
    edges: nodes.slice(1).map((node, index) => ({ id: `edge-${index}`, source: nodes[index].id, sourcePort: "next", target: node.id })),
  };
}
