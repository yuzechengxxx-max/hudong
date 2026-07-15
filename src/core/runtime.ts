import type { ComparisonOperator, Project, StoryNode, VariableOperation } from "./project";

export type RuntimeEffect =
  | { type: "music-play"; assetId: string; volume: number }
  | { type: "music-stop" }
  | { type: "music-fade-out" }
  | { type: "sound-play"; assetId: string; volume: number };

export interface RuntimeSnapshot {
  currentNodeId: string | null;
  variables: Record<string, string | number | boolean>;
  visitedNodeIds: string[];
  status: "idle" | "playing" | "awaiting-choice" | "waiting" | "ended" | "error";
  pendingInteraction?: { type: "wait" | "timed-choice"; durationMs: number };
  effects: RuntimeEffect[];
  error?: { code: string; message: string; nodeId?: string };
}

export interface RuntimeOptions {
  random?: () => number;
}

export function createRuntime(project: Project, options: RuntimeOptions = {}) {
  let state: RuntimeSnapshot = {
    currentNodeId: null,
    variables: Object.fromEntries(project.variables.map(variable => [variable.id, variable.initialValue])),
    visitedNodeIds: [],
    status: "idle",
    effects: [],
  };
  const random = options.random ?? Math.random;
  const nodes = new Map(project.nodes.map(node => [node.id, node]));
  const chapters = new Map(project.nodes.flatMap(node => node.kind === "chapter" ? [[node.chapterId, node.id] as const] : []));
  const targets = new Map(project.edges.map(edge => [`${edge.source}:${edge.sourcePort}`, edge.target]));
  const target = (source: string, port: string) => targets.get(`${source}:${port}`) ?? null;

  function fail(code: string, message: string, nodeId?: string): RuntimeSnapshot {
    state = { ...state, status: "error", pendingInteraction: undefined, error: { code, message, nodeId } };
    return state;
  }

  function move(targetId: string | null, depth = 0): RuntimeSnapshot {
    if (depth > 1000) return fail("automatic-cycle", "自动节点执行超过 1000 步", state.currentNodeId ?? undefined);
    const node = targetId ? nodes.get(targetId) : undefined;
    if (!node) return fail("missing-target", "剧情连接指向不存在的节点", targetId ?? undefined);
    state = {
      ...state,
      currentNodeId: node.id,
      visitedNodeIds: [...state.visitedNodeIds, node.id],
      pendingInteraction: undefined,
      error: undefined,
    };

    if (node.kind === "start" || node.kind === "chapter") return move(target(node.id, "next"), depth + 1);
    if (node.kind === "jump") {
      const chapterNodeId = chapters.get(node.chapterId);
      return chapterNodeId ? move(chapterNodeId, depth + 1) : fail("missing-jump-target", `找不到章节：${node.chapterId}`, node.id);
    }
    if (node.kind === "setVariable") {
      const nextValue = applyVariableOperation(state.variables[node.variableId], node.operation, node.value);
      if (nextValue.error) return fail(nextValue.error.code, nextValue.error.message, node.id);
      state = { ...state, variables: { ...state.variables, [node.variableId]: nextValue.value } };
      return move(target(node.id, "next"), depth + 1);
    }
    if (node.kind === "condition") {
      const port = compare(state.variables[node.variableId] ?? 0, node.operator, node.value) ? "true" : "false";
      return move(target(node.id, port), depth + 1);
    }
    if (node.kind === "random") {
      const port = chooseWeightedBranch(node, random());
      return port ? move(target(node.id, port), depth + 1) : fail("invalid-random-weight", "随机分支没有有效权重", node.id);
    }
    if (node.kind === "music") {
      const effect = musicEffect(node);
      if (!effect) return fail("missing-audio-asset", "播放音乐时没有选择音频素材", node.id);
      state = { ...state, effects: [...state.effects, effect] };
      return move(target(node.id, "next"), depth + 1);
    }
    if (node.kind === "sound") {
      if (!node.assetId) return fail("missing-audio-asset", "播放音效时没有选择音频素材", node.id);
      state = { ...state, effects: [...state.effects, { type: "sound-play", assetId: node.assetId, volume: node.volume }] };
      return move(target(node.id, "next"), depth + 1);
    }
    if (node.kind === "wait") {
      state = { ...state, status: "waiting", pendingInteraction: { type: "wait", durationMs: node.durationMs } };
      return state;
    }
    if (node.kind === "choice") {
      state = { ...state, status: "awaiting-choice" };
      return state;
    }
    if (node.kind === "timedChoice") {
      state = { ...state, status: "awaiting-choice", pendingInteraction: { type: "timed-choice", durationMs: node.durationMs } };
      return state;
    }
    if (node.kind === "ending") {
      state = { ...state, status: "ended" };
      return state;
    }
    state = { ...state, status: "playing" };
    return state;
  }

  return {
    start(nodeId?: string) {
      return move(nodeId ?? project.nodes.find(node => node.kind === "start")?.id ?? null);
    },
    advance() {
      return state.currentNodeId ? move(target(state.currentNodeId, "next")) : state;
    },
    choose(portId: string) {
      return state.status === "awaiting-choice" && state.currentNodeId ? move(target(state.currentNodeId, portId)) : state;
    },
    timeout() {
      return state.status === "awaiting-choice" && state.pendingInteraction?.type === "timed-choice" && state.currentNodeId
        ? move(target(state.currentNodeId, "timeout"))
        : state;
    },
    resume() {
      return state.status === "waiting" && state.currentNodeId ? move(target(state.currentNodeId, "next")) : state;
    },
    consumeEffects() {
      const effects = structuredClone(state.effects);
      state = { ...state, effects: [] };
      return effects;
    },
    restore(snapshot: RuntimeSnapshot) {
      state = structuredClone(snapshot);
      return state;
    },
    snapshot: () => structuredClone(state),
  };
}

function compare(left: string | number | boolean, operator: ComparisonOperator, right: string | number | boolean) {
  if (operator === "eq") return left === right;
  if (operator === "neq") return left !== right;
  if (operator === "contains") return String(left).includes(String(right));
  if (operator === "notContains") return !String(left).includes(String(right));
  if (operator === "gt") return Number(left) > Number(right);
  if (operator === "gte") return Number(left) >= Number(right);
  if (operator === "lt") return Number(left) < Number(right);
  return Number(left) <= Number(right);
}

function applyVariableOperation(previous: string | number | boolean | undefined, operation: VariableOperation, value: string | number | boolean): { value: string | number | boolean; error?: undefined } | { value?: undefined; error: { code: string; message: string } } {
  if (operation === "set") return { value };
  if (operation === "append") return { value: `${String(previous ?? "")}${String(value)}` };
  if (operation === "toggle") return { value: !Boolean(previous) };
  const left = Number(previous ?? 0);
  const right = Number(value);
  if (operation === "add") return { value: left + right };
  if (operation === "subtract") return { value: left - right };
  if (operation === "multiply") return { value: left * right };
  if (right === 0) return { error: { code: "division-by-zero", message: "变量不能除以零" } };
  return { value: left / right };
}

function chooseWeightedBranch(node: Extract<StoryNode, { kind: "random" }>, randomValue: number) {
  const total = node.branches.reduce((sum, branch) => sum + branch.weight, 0);
  if (total <= 0) return undefined;
  let cursor = Math.min(Math.max(randomValue, 0), 0.999999999) * total;
  for (const branch of node.branches) {
    cursor -= branch.weight;
    if (cursor < 0) return branch.id;
  }
  return node.branches.at(-1)?.id;
}

function musicEffect(node: Extract<StoryNode, { kind: "music" }>): RuntimeEffect | undefined {
  if (node.action === "stop") return { type: "music-stop" };
  if (node.action === "fadeOut") return { type: "music-fade-out" };
  return node.assetId ? { type: "music-play", assetId: node.assetId, volume: node.volume } : undefined;
}
