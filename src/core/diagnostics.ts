import { getNodeOutputs } from "./nodeRegistry";
import type { Project, StoryNode } from "./project";

export interface DiagnosticIssue {
  code:
    | "missing-entry" | "duplicate-entry" | "dangling-edge" | "missing-output" | "unreachable-node"
    | "missing-jump-target" | "duplicate-chapter" | "missing-variable" | "invalid-variable-operation"
    | "missing-asset" | "invalid-asset-type" | "invalid-random-weight" | "invalid-duration" | "division-by-zero";
  severity: "error" | "warning";
  message: string;
  nodeId?: string;
  portId?: string;
  assetId?: string;
}

export function diagnoseProject(project: Project): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];
  const starts = project.nodes.filter(node => node.kind === "start");
  const start = starts[0];
  if (!start) issues.push({ code: "missing-entry", severity: "error", message: "项目没有故事入口" });
  for (const duplicate of starts.slice(1)) issues.push({ code: "duplicate-entry", severity: "error", message: "项目只能有一个故事入口", nodeId: duplicate.id });

  const nodeIds = new Set(project.nodes.map(node => node.id));
  const variables = new Map(project.variables.map(variable => [variable.id, variable]));
  const assets = new Map(project.assets.map(asset => [asset.id, asset]));
  const outgoing = new Map<string, Map<string, string>>();
  for (const edge of project.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      issues.push({ code: "dangling-edge", severity: "error", message: "连接指向不存在的节点" });
      continue;
    }
    const ports = outgoing.get(edge.source) ?? new Map<string, string>();
    ports.set(edge.sourcePort, edge.target);
    outgoing.set(edge.source, ports);
  }

  const chapters = new Map<string, StoryNode & { kind: "chapter" }>();
  for (const node of project.nodes) {
    if (node.kind !== "chapter") continue;
    if (chapters.has(node.anchorId)) issues.push({ code: "duplicate-chapter", severity: "error", message: `章节标识“${node.anchorId}”重复`, nodeId: node.id });
    else chapters.set(node.anchorId, node);
  }

  const visited = new Set<string>();
  const queue = start ? [start.id] : [];
  while (queue.length) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const node = project.nodes.find(item => item.id === id);
    outgoing.get(id)?.forEach(target => queue.push(target));
    if (node?.kind === "jump") {
      const chapter = chapters.get(node.targetId);
      if (chapter) queue.push(chapter.id);
    }
  }

  for (const node of project.nodes) {
    if (start && !visited.has(node.id)) issues.push({ code: "unreachable-node", severity: "warning", message: `“${node.title}”无法从入口到达`, nodeId: node.id });
    for (const port of getNodeOutputs(node)) {
      if (!outgoing.get(node.id)?.has(port.id)) issues.push({ code: "missing-output", severity: "error", message: `“${node.title}”的“${port.label}”没有连接`, nodeId: node.id, portId: port.id });
    }
    validateNode(node, variables, assets, chapters, issues);
  }
  return issues;
}

function validateNode(
  node: StoryNode,
  variables: Map<string, Project["variables"][number]>,
  assets: Map<string, Project["assets"][number]>,
  chapters: Map<string, StoryNode & { kind: "chapter" }>,
  issues: DiagnosticIssue[],
) {
  if (node.kind === "jump" && node.targetType === "anchor" && !chapters.has(node.targetId)) {
    issues.push({ code: "missing-jump-target", severity: "error", message: `找不到章节“${node.targetId}”`, nodeId: node.id });
  }
  if (node.kind === "condition" || node.kind === "setVariable") {
    const variable = variables.get(node.variableId);
    if (!variable) issues.push({ code: "missing-variable", severity: "error", message: `找不到变量“${node.variableId}”`, nodeId: node.id });
    else if (!isVariableUseCompatible(node, variable.type)) issues.push({ code: "invalid-variable-operation", severity: "error", message: `“${node.title}”的操作与变量类型不兼容`, nodeId: node.id });
  }
  if (node.kind === "setVariable" && node.operation === "divide" && Number(node.value) === 0) {
    issues.push({ code: "division-by-zero", severity: "error", message: "变量不能除以零", nodeId: node.id });
  }
  if (node.kind === "random" && node.branches.some(branch => !Number.isInteger(branch.weight) || branch.weight <= 0)) {
    issues.push({ code: "invalid-random-weight", severity: "error", message: "随机分支权重必须是正整数", nodeId: node.id });
  }
  if ((node.kind === "wait" || node.kind === "timedChoice") && (!Number.isInteger(node.durationMs) || node.durationMs <= 0)) {
    issues.push({ code: "invalid-duration", severity: "error", message: "等待时间必须大于零", nodeId: node.id });
  }
  const assetId = node.kind === "sound" ? node.assetId : node.kind === "music" && node.action === "play" ? node.assetId : undefined;
  if (assetId !== undefined) {
    const asset = assets.get(assetId);
    if (!asset) issues.push({ code: "missing-asset", severity: "error", message: "找不到音频素材", nodeId: node.id, assetId });
    else if (!asset.type.startsWith("audio/")) issues.push({ code: "invalid-asset-type", severity: "error", message: `“${asset.name}”不是音频素材`, nodeId: node.id, assetId });
  }
}

function isVariableUseCompatible(node: Extract<StoryNode, { kind: "condition" | "setVariable" }>, type: Project["variables"][number]["type"]) {
  if (node.kind === "condition") {
    if (type === "number") return ["eq", "neq", "gt", "gte", "lt", "lte"].includes(node.operator) && typeof node.value === "number";
    if (type === "string") return ["eq", "neq", "contains", "notContains"].includes(node.operator) && typeof node.value === "string";
    return ["eq", "neq"].includes(node.operator) && typeof node.value === "boolean";
  }
  if (type === "number") return ["set", "add", "subtract", "multiply", "divide"].includes(node.operation) && typeof node.value === "number";
  if (type === "string") return ["set", "append"].includes(node.operation) && typeof node.value === "string";
  return ["set", "toggle"].includes(node.operation) && (node.operation === "toggle" || typeof node.value === "boolean");
}
