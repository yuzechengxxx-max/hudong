import type { ComparisonOperator, Project, StoryNode } from "./project";

export interface RuntimeSnapshot { currentNodeId: string | null; variables: Record<string, string | number | boolean>; visitedNodeIds: string[]; status: "idle" | "playing" | "awaiting-choice" | "ended" | "error"; }

export function createRuntime(project: Project) {
  let state: RuntimeSnapshot = { currentNodeId: null, variables: Object.fromEntries(project.variables.map(v => [v.id, v.initialValue])), visitedNodeIds: [], status: "idle" };
  const nodes = new Map(project.nodes.map(node => [node.id, node]));
  const target = (source: string, port: string) => project.edges.find(edge => edge.source === source && edge.sourcePort === port)?.target ?? null;
  const compare = (left: string | number | boolean, operator: ComparisonOperator, right: string | number | boolean) => {
    if (operator === "eq") return left === right;
    if (operator === "neq") return left !== right;
    if (operator === "contains") return String(left).includes(String(right));
    if (operator === "notContains") return !String(left).includes(String(right));
    if (operator === "gt") return Number(left) > Number(right);
    if (operator === "gte") return Number(left) >= Number(right);
    if (operator === "lt") return Number(left) < Number(right);
    return Number(left) <= Number(right);
  };

  function move(targetId: string | null, depth = 0): RuntimeSnapshot {
    if (depth > 1000) return state = { ...state, status: "error" };
    const node = targetId ? nodes.get(targetId) : undefined;
    if (!node) return state = { ...state, status: "error" };
    state = { ...state, currentNodeId: node.id, visitedNodeIds: [...state.visitedNodeIds, node.id] };
    if (node.kind === "start") return move(target(node.id, "next"), depth + 1);
    if (node.kind === "setVariable") {
      const previous = state.variables[node.variableId] ?? 0;
      const next = node.operation === "add" ? Number(previous) + Number(node.value) : node.value;
      state = { ...state, variables: { ...state.variables, [node.variableId]: next } };
      return move(target(node.id, "next"), depth + 1);
    }
    if (node.kind === "condition") return move(target(node.id, compare(state.variables[node.variableId] ?? 0, node.operator, node.value) ? "true" : "false"), depth + 1);
    if (node.kind === "choice") return state = { ...state, status: "awaiting-choice" };
    if (node.kind === "ending") return state = { ...state, status: "ended" };
    return state = { ...state, status: "playing" };
  }

  return {
    start(nodeId?: string) { return move(nodeId ?? project.nodes.find(node => node.kind === "start")?.id ?? null); },
    advance() { return state.currentNodeId ? move(target(state.currentNodeId, "next")) : state; },
    choose(portId: string) { return state.status === "awaiting-choice" && state.currentNodeId ? move(target(state.currentNodeId, portId)) : state; },
    restore(snapshot: RuntimeSnapshot) { state = structuredClone(snapshot); return state; },
    snapshot: () => structuredClone(state),
  };
}
