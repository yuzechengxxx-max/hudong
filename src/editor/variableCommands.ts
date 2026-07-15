import type { ComparisonOperator, Project, VariableOperation } from "../core/project";

export type VariableType = Project["variables"][number]["type"];
export type VariableReference = { nodeId: string; chapterId: string; kind: "condition" | "setVariable" };

export function indexVariableReferences(project: Project) {
  const index = new Map<string, VariableReference[]>();
  for (const node of project.nodes) {
    if (node.kind !== "condition" && node.kind !== "setVariable") continue;
    const references = index.get(node.variableId) ?? [];
    references.push({ nodeId: node.id, chapterId: node.chapterId, kind: node.kind });
    index.set(node.variableId, references);
  }
  return index;
}

export function updateVariable(project: Project, variableId: string, patch: Partial<Pick<Project["variables"][number], "name" | "initialValue">>) {
  requireVariable(project, variableId);
  if (patch.name !== undefined && !patch.name.trim()) throw new Error("Variable name is required");
  return {
    ...project,
    variables: project.variables.map(variable => variable.id === variableId ? { ...variable, ...patch, name: patch.name?.trim() ?? variable.name } : variable),
  };
}

export function changeVariableType(project: Project, variableId: string, type: VariableType): { ok: true; project: Project } | { ok: false; nodeIds: string[] } {
  const variable = requireVariable(project, variableId);
  if (variable.type === type) return { ok: true, project };
  const incompatible = project.nodes.filter(node => {
    if (node.kind === "condition" && node.variableId === variableId) return !conditionOperators[type].includes(node.operator);
    if (node.kind === "setVariable" && node.variableId === variableId) return !variableOperations[type].includes(node.operation);
    return false;
  });
  if (incompatible.length) return { ok: false, nodeIds: incompatible.map(node => node.id) };
  const initialValue = convertValue(variable.initialValue, type);
  if (initialValue === undefined) return { ok: false, nodeIds: [] };
  return { ok: true, project: { ...project, variables: project.variables.map(item => item.id === variableId ? { ...item, type, initialValue } : item) } };
}

export function replaceAndDeleteVariable(project: Project, variableId: string, replacementId: string): Project {
  const variable = requireVariable(project, variableId);
  const replacement = requireVariable(project, replacementId);
  if (variableId === replacementId) throw new Error("Replacement variable must be different");
  if (variable.type !== replacement.type) throw new Error("Replacement variable type must match");
  return {
    ...project,
    variables: project.variables.filter(item => item.id !== variableId),
    nodes: project.nodes.map(node => (node.kind === "condition" || node.kind === "setVariable") && node.variableId === variableId ? { ...node, variableId: replacementId } : node),
  };
}

export function deleteUnusedVariable(project: Project, variableId: string): Project {
  requireVariable(project, variableId);
  if (indexVariableReferences(project).get(variableId)?.length) throw new Error("Variable is still referenced");
  return { ...project, variables: project.variables.filter(variable => variable.id !== variableId) };
}

const conditionOperators: Record<VariableType, ComparisonOperator[]> = {
  number: ["eq", "neq", "gt", "gte", "lt", "lte"],
  string: ["eq", "neq", "contains", "notContains"],
  boolean: ["eq", "neq"],
};

const variableOperations: Record<VariableType, VariableOperation[]> = {
  number: ["set", "add", "subtract", "multiply", "divide"],
  string: ["set", "append"],
  boolean: ["set", "toggle"],
};

function convertValue(value: string | number | boolean, type: VariableType) {
  if (type === "string") return String(value);
  if (type === "number") {
    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
  }
  if (typeof value === "boolean") return value;
  if (value === "true" || value === 1) return true;
  if (value === "false" || value === 0) return false;
  return undefined;
}

function requireVariable(project: Project, variableId: string) {
  const variable = project.variables.find(item => item.id === variableId);
  if (!variable) throw new Error(`Unknown variable: ${variableId}`);
  return variable;
}
