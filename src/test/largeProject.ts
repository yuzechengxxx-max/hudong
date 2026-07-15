import { createStarterProject, type Project, type StoryNode } from "../core/project";

export function createLargeProject(count: number, requestedChapterCount = 1): Project {
  const base = createStarterProject();
  const chapterCount = Math.max(1, Math.min(Math.floor(requestedChapterCount), Math.floor(count / 2)));
  const nodes: StoryNode[] = [];
  const edges: Project["edges"] = [];
  const chapters: Project["chapters"] = [];
  let globalIndex = 0;

  for (let chapterIndex = 0; chapterIndex < chapterCount; chapterIndex += 1) {
    const chapterId = chapterIndex === 0 ? "main-story" : `chapter-${chapterIndex + 1}`;
    const size = Math.floor(count / chapterCount) + (chapterIndex < count % chapterCount ? 1 : 0);
    const entryNodeId = `${chapterId}-start`;
    chapters.push({ id: chapterId, name: chapterIndex === 0 ? "主剧情" : `第 ${chapterIndex + 1} 章`, order: chapterIndex, entryNodeId });
    for (let localIndex = 0; localIndex < size; localIndex += 1) {
      const id = localIndex === 0 ? entryNodeId : `${chapterId}-node-${localIndex}`;
      const position = { x: (localIndex % 20) * 240, y: Math.floor(localIndex / 20) * 170 };
      let node: StoryNode;
      if (localIndex === 0) node = { id, kind: "start", title: `${chapters.at(-1)!.name}入口`, position, chapterId };
      else if (localIndex === size - 1 && chapterIndex < chapterCount - 1) node = { id, kind: "jump", title: "前往下一章", position, chapterId, targetType: "chapter", targetId: `chapter-${chapterIndex + 2}` };
      else if (localIndex === size - 1) node = { id, kind: "ending", title: "大型项目结局", position, chapterId, endingTitle: "测试完成" };
      else node = { id, kind: "scene", title: `场景 ${globalIndex}`, position, chapterId, mediaUrl: "", speaker: "", dialogue: "", showDialogue: false };
      nodes.push(node);
      if (localIndex > 0) edges.push({ id: `edge-${globalIndex}`, source: nodes[nodes.length - 2].id, sourcePort: "next", target: id });
      globalIndex += 1;
    }
  }
  return {
    ...base,
    nodes,
    edges,
    chapters,
    defaultChapterId: "main-story",
  };
}
