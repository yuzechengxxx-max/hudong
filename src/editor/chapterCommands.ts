import type { Project, StoryNode } from "../core/project";

type ReorderDirection = "up" | "down";

export function createChapter(project: Project, name: string, seed: string): { project: Project; chapterId: string } {
  const chapterId = uniqueId(`chapter-${normalizeSeed(seed)}`, new Set(project.chapters.map(chapter => chapter.id)));
  const entryNodeId = uniqueId(`${chapterId}-start`, new Set(project.nodes.map(node => node.id)));
  const order = project.chapters.length;
  return {
    chapterId,
    project: {
      ...project,
      chapters: [...project.chapters, { id: chapterId, name: name.trim() || "Untitled Chapter", order, entryNodeId }],
      nodes: [...project.nodes, { id: entryNodeId, kind: "start", title: name.trim() || "Untitled Chapter", position: { x: 40, y: 160 }, chapterId }],
    },
  };
}

export function renameChapter(project: Project, chapterId: string, name: string): Project {
  const nextName = name.trim();
  if (!nextName) throw new Error("Chapter name is required");
  requireChapter(project, chapterId);
  return { ...project, chapters: project.chapters.map(chapter => chapter.id === chapterId ? { ...chapter, name: nextName } : chapter) };
}

export function reorderChapter(project: Project, chapterId: string, direction: ReorderDirection): Project {
  requireChapter(project, chapterId);
  const ordered = [...project.chapters].sort((a, b) => a.order - b.order);
  const index = ordered.findIndex(chapter => chapter.id === chapterId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= ordered.length) return project;
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  return { ...project, chapters: ordered.map((chapter, order) => ({ ...chapter, order })) };
}

export function duplicateChapter(project: Project, chapterId: string, seed: string): Project {
  const source = requireChapter(project, chapterId);
  const suffix = normalizeSeed(seed);
  const newChapterId = uniqueId(`chapter-${suffix}`, new Set(project.chapters.map(chapter => chapter.id)));
  const sourceNodes = project.nodes.filter(node => node.chapterId === chapterId);
  const usedNodeIds = new Set(project.nodes.map(node => node.id));
  const nodeIds = new Map(sourceNodes.map(node => [node.id, uniqueId(`${node.id}-${suffix}`, usedNodeIds)]));
  nodeIds.forEach(id => usedNodeIds.add(id));

  const copiedNodes = sourceNodes.map(node => remapNode(node, newChapterId, suffix, nodeIds, chapterId));
  const sourceNodeIds = new Set(sourceNodes.map(node => node.id));
  const usedEdgeIds = new Set(project.edges.map(edge => edge.id));
  const copiedEdges = project.edges
    .filter(edge => sourceNodeIds.has(edge.source) && sourceNodeIds.has(edge.target))
    .map(edge => ({
      ...edge,
      id: uniqueId(`${edge.id}-${suffix}`, usedEdgeIds),
      source: nodeIds.get(edge.source)!,
      target: nodeIds.get(edge.target)!,
      sourcePort: remapPort(edge.sourcePort, suffix),
    }));

  return {
    ...project,
    chapters: [...project.chapters, { ...source, id: newChapterId, name: `${source.name} Copy`, order: project.chapters.length, entryNodeId: nodeIds.get(source.entryNodeId)! }],
    nodes: [...project.nodes, ...copiedNodes],
    edges: [...project.edges, ...copiedEdges],
  };
}

export function deleteChapter(project: Project, chapterId: string): Project {
  if (chapterId === project.defaultChapterId) throw new Error("Cannot delete the default chapter");
  requireChapter(project, chapterId);
  const removedNodeIds = new Set(project.nodes.filter(node => node.chapterId === chapterId).map(node => node.id));
  const chapters = project.chapters
    .filter(chapter => chapter.id !== chapterId)
    .sort((a, b) => a.order - b.order)
    .map((chapter, order) => ({ ...chapter, order }));
  return {
    ...project,
    chapters,
    nodes: project.nodes.filter(node => !removedNodeIds.has(node.id)),
    edges: project.edges.filter(edge => !removedNodeIds.has(edge.source) && !removedNodeIds.has(edge.target)),
  };
}

function remapNode(node: StoryNode, chapterId: string, suffix: string, nodeIds: Map<string, string>, sourceChapterId: string): StoryNode {
  const base = { ...structuredClone(node), id: nodeIds.get(node.id)!, chapterId };
  if (base.kind === "choice" || base.kind === "timedChoice") {
    return { ...base, choices: base.choices.map(choice => ({ ...choice, id: remapPort(choice.id, suffix) })) };
  }
  if (base.kind === "random") {
    return { ...base, branches: base.branches.map(branch => ({ ...branch, id: remapPort(branch.id, suffix) })) };
  }
  if (base.kind === "jump" && base.targetType === "chapter" && base.targetId === sourceChapterId) {
    return { ...base, targetId: chapterId };
  }
  return base;
}

function remapPort(portId: string, suffix: string) {
  return ["next", "true", "false", "timeout"].includes(portId) ? portId : `${portId}-${suffix}`;
}

function requireChapter(project: Project, chapterId: string) {
  const chapter = project.chapters.find(item => item.id === chapterId);
  if (!chapter) throw new Error(`Unknown chapter: ${chapterId}`);
  return chapter;
}

function normalizeSeed(seed: string) {
  const normalized = seed.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized || "copy";
}

function uniqueId(preferred: string, used: Set<string>) {
  if (!used.has(preferred)) return preferred;
  let index = 2;
  while (used.has(`${preferred}-${index}`)) index += 1;
  return `${preferred}-${index}`;
}
