import type { Project, StoryNode } from "../core/project";

export function removeSelection(project: Project, selectedIds: string[]): Project {
  const removable = new Set(selectedIds.filter(id => project.nodes.find(node => node.id === id)?.kind !== "start"));
  return {
    ...project,
    nodes: project.nodes.filter(node => !removable.has(node.id)),
    edges: project.edges.filter(edge => !removable.has(edge.source) && !removable.has(edge.target)),
  };
}

export function duplicateSelection(project: Project, selectedIds: string[], offset = 32, seed = String(Date.now())) {
  const selected = new Set(selectedIds);
  const originals = project.nodes.filter(node => selected.has(node.id) && node.kind !== "start");
  const nodeIds = new Map(originals.map((node, index) => [node.id, `${node.kind}-${seed}-${index}`]));
  const portIds = new Map<string, string>();

  const copies = originals.map((node, index): StoryNode => {
    const common = { id: nodeIds.get(node.id)!, title: `${node.title} 副本`, position: { x: node.position.x + offset, y: node.position.y + offset } };
    if (node.kind !== "choice") return { ...node, ...common };
    return {
      ...node,
      ...common,
      choices: node.choices.map((choice, choiceIndex) => {
        const id = `choice-${seed}-${index}-${choiceIndex}`;
        portIds.set(`${node.id}:${choice.id}`, id);
        return { ...choice, id };
      }),
    };
  });

  const copiedEdges = project.edges.flatMap((edge, index) => {
    const source = nodeIds.get(edge.source);
    const target = nodeIds.get(edge.target);
    if (!source || !target) return [];
    return [{
      ...edge,
      id: `edge-${seed}-${index}`,
      source,
      target,
      sourcePort: portIds.get(`${edge.source}:${edge.sourcePort}`) ?? edge.sourcePort,
    }];
  });

  return {
    project: { ...project, nodes: [...project.nodes, ...copies], edges: [...project.edges, ...copiedEdges] },
    selectedIds: copies.map(node => node.id),
  };
}
