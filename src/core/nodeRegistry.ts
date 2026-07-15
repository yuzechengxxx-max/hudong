import type { NodeKind, StoryNode } from "./project";

export type NodeCategory = "content" | "interaction" | "logic" | "performance" | "structure" | "ending";
export type NodeRuntimeMode = "visible" | "automatic" | "waiting";

export interface NodeDefinition<K extends NodeKind = NodeKind> {
  kind: K;
  label: string;
  description: string;
  category: NodeCategory;
  color: string;
  runtimeMode: NodeRuntimeMode;
  searchTerms: readonly string[];
}

export const nodeDefinitions = [
  { kind: "start", label: "故事入口", description: "项目的唯一开始位置", category: "structure", color: "#83909c", runtimeMode: "automatic", searchTerms: ["开始", "入口"] },
  { kind: "scene", label: "视频场景", description: "播放视频或图片场景", category: "content", color: "#4b8fac", runtimeMode: "visible", searchTerms: ["视频", "图片", "场景"] },
  { kind: "choice", label: "玩家选择", description: "显示不限数量的剧情选项", category: "interaction", color: "#d1a83d", runtimeMode: "visible", searchTerms: ["选项", "分支"] },
  { kind: "timedChoice", label: "限时选择", description: "倒计时结束后进入超时分支", category: "interaction", color: "#db8f3f", runtimeMode: "visible", searchTerms: ["倒计时", "超时", "选项"] },
  { kind: "condition", label: "条件判断", description: "根据变量比较结果选择路线", category: "logic", color: "#54a77b", runtimeMode: "automatic", searchTerms: ["判断", "变量", "比较"] },
  { kind: "setVariable", label: "修改变量", description: "设置或运算项目变量", category: "logic", color: "#bd6d6d", runtimeMode: "automatic", searchTerms: ["变量", "数值", "赋值"] },
  { kind: "random", label: "随机分支", description: "按权重随机选择一条路线", category: "logic", color: "#9b78c6", runtimeMode: "automatic", searchTerms: ["随机", "概率", "权重"] },
  { kind: "wait", label: "等待", description: "暂停一段时间后继续", category: "logic", color: "#7b8794", runtimeMode: "waiting", searchTerms: ["延时", "暂停", "计时"] },
  { kind: "music", label: "音乐控制", description: "播放、停止或淡出背景音乐", category: "performance", color: "#5f8bc8", runtimeMode: "automatic", searchTerms: ["背景音乐", "BGM", "淡出"] },
  { kind: "sound", label: "播放音效", description: "播放一次音效素材", category: "performance", color: "#5aa6a6", runtimeMode: "automatic", searchTerms: ["音效", "声音", "SFX"] },
  { kind: "chapter", label: "章节入口", description: "大型剧情中的可跳转锚点", category: "structure", color: "#8a94a3", runtimeMode: "automatic", searchTerms: ["章节", "锚点", "入口"] },
  { kind: "jump", label: "跳转章节", description: "直接前往指定章节入口", category: "structure", color: "#7887a8", runtimeMode: "automatic", searchTerms: ["跳转", "章节", "传送"] },
  { kind: "ending", label: "故事结局", description: "结束本次剧情流程", category: "ending", color: "#d46f48", runtimeMode: "visible", searchTerms: ["结束", "结局"] },
] as const satisfies readonly NodeDefinition[];

const definitionsByKind = new Map<NodeKind, NodeDefinition>(nodeDefinitions.map(definition => [definition.kind, definition]));

export function getNodeDefinition(kind: NodeKind): NodeDefinition {
  const definition = definitionsByKind.get(kind);
  if (!definition) throw new Error(`未知节点类型：${kind}`);
  return definition;
}

export function getNodeOutputs(node: StoryNode): Array<{ id: string; label: string }> {
  if (node.kind === "choice") return node.choices.map(choice => ({ id: choice.id, label: choice.label }));
  if (node.kind === "timedChoice") return [...node.choices.map(choice => ({ id: choice.id, label: choice.label })), { id: "timeout", label: "超时" }];
  if (node.kind === "condition") return [{ id: "true", label: "成立" }, { id: "false", label: "不成立" }];
  if (node.kind === "random") return node.branches.map(branch => ({ id: branch.id, label: branch.label }));
  if (node.kind === "jump" || node.kind === "ending") return [];
  return [{ id: "next", label: "下一步" }];
}
