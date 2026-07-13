import type { Project, StoryNode } from "./project";

export interface RuntimeSnapshot {
  currentNodeId: string | null;
  variables: Record<string, string | number | boolean>;
  visitedNodeIds: string[];
  status: "idle" | "playing" | "awaiting-choice" | "ended" | "error";
}

export function createRuntime(project: Project) {
  let state: RuntimeSnapshot = {
    currentNodeId: null,
    variables: Object.fromEntries(project.variables.map(variable => [variable.id, variable.initialValue])),
    visitedNodeIds: [],
    status: "idle",
  };

  const nodeById = new Map(project.nodes.map(node => [node.id, node]));

  function edgeTarget(source: string, sourcePort: string) {
    return project.edges.find(edge => edge.source === source && edge.sourcePort === sourcePort)?.target ?? null;
  }

  function visit(node: StoryNode): RuntimeSnapshot {
    state = { ...state, currentNodeId: node.id, visitedNodeIds: [...state.visitedNodeIds, node.id] };
    if (node.kind === "choice") return state = { ...state, status: "awaiting-choice" };
    if (node.kind === "ending") return state = { ...state, status: "ended" };
    return state = { ...state, status: "playing" };
  }

  function move(targetId: string | null): RuntimeSnapshot {
    const node = targetId ? nodeById.get(targetId) : undefined;
    if (!node) return state = { ...state, status: "error" };
    if (node.kind === "start") return move(edgeTarget(node.id, "next"));
    return visit(node);
  }

  return {
    start(nodeId?: string) {
      const entry = nodeId ?? project.nodes.find(node => node.kind === "start")?.id ?? null;
      return move(entry);
    },
    advance() {
      if (!state.currentNodeId) return state;
      return move(edgeTarget(state.currentNodeId, "next"));
    },
    choose(portId: string) {
      if (state.status !== "awaiting-choice" || !state.currentNodeId) return state;
      return move(edgeTarget(state.currentNodeId, portId));
    },
    snapshot: () => structuredClone(state),
  };
}
