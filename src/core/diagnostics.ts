import type { Project } from "./project";

export interface DiagnosticIssue {
  code: "missing-entry" | "dangling-edge" | "missing-output" | "unreachable-node";
  severity: "error" | "warning";
  message: string;
  nodeId?: string;
}

export function diagnoseProject(project: Project): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];
  const start = project.nodes.find(node => node.kind === "start");
  if (!start) issues.push({ code: "missing-entry", severity: "error", message: "项目没有故事入口" });

  const nodeIds = new Set(project.nodes.map(node => node.id));
  for (const edge of project.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      issues.push({ code: "dangling-edge", severity: "error", message: "连接指向不存在的节点" });
    }
  }

  const visited = new Set<string>();
  const queue = start ? [start.id] : [];
  while (queue.length) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    project.edges.filter(edge => edge.source === id).forEach(edge => queue.push(edge.target));
  }

  for (const node of project.nodes) {
    if (start && !visited.has(node.id)) issues.push({ code: "unreachable-node", severity: "warning", message: `“${node.title}”无法从入口到达`, nodeId: node.id });
    if (node.kind !== "ending" && !project.edges.some(edge => edge.source === node.id)) {
      issues.push({ code: "missing-output", severity: "error", message: `“${node.title}”没有后续连接`, nodeId: node.id });
    }
  }
  return issues;
}
