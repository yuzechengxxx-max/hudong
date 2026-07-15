import { z } from "zod";

const PositionSchema = z.object({ x: z.number(), y: z.number() });
const BaseNodeSchema = z.object({ id: z.string().min(1), title: z.string().min(1), position: PositionSchema, chapterId: z.string().min(1) });
const ValueSchema = z.union([z.string(), z.number(), z.boolean()]);
const ChoiceOptionSchema = z.object({ id: z.string().min(1), label: z.string().min(1) });
const DisplaySettingsSchema = z.object({
  aspectRatio: z.enum(["16:9", "21:9", "4:3"]),
  width: z.number().int().min(320).max(7680),
  height: z.number().int().min(180).max(4320),
});

export const ComparisonOperatorSchema = z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "contains", "notContains"]);
export const VariableOperationSchema = z.enum(["set", "add", "subtract", "multiply", "divide", "append", "toggle"]);

export const StoryNodeSchema = z.discriminatedUnion("kind", [
  BaseNodeSchema.extend({ kind: z.literal("start") }),
  BaseNodeSchema.extend({ kind: z.literal("scene"), assetId: z.string().optional(), mediaUrl: z.string(), speaker: z.string(), dialogue: z.string(), showDialogue: z.boolean().default(true) }),
  BaseNodeSchema.extend({ kind: z.literal("choice"), prompt: z.string(), choices: z.array(ChoiceOptionSchema).min(1) }),
  BaseNodeSchema.extend({ kind: z.literal("timedChoice"), prompt: z.string(), choices: z.array(ChoiceOptionSchema).min(1), durationMs: z.number().int().positive() }),
  BaseNodeSchema.extend({ kind: z.literal("condition"), variableId: z.string(), operator: ComparisonOperatorSchema, value: ValueSchema }),
  BaseNodeSchema.extend({ kind: z.literal("setVariable"), variableId: z.string(), operation: VariableOperationSchema, value: ValueSchema }),
  BaseNodeSchema.extend({ kind: z.literal("random"), branches: z.array(z.object({ id: z.string().min(1), label: z.string().min(1), weight: z.number().int().positive() })).min(2).max(8) }),
  BaseNodeSchema.extend({ kind: z.literal("wait"), durationMs: z.number().int().positive() }),
  BaseNodeSchema.extend({ kind: z.literal("music"), action: z.enum(["play", "stop", "fadeOut"]), assetId: z.string().optional(), volume: z.number().min(0).max(1) }),
  BaseNodeSchema.extend({ kind: z.literal("sound"), assetId: z.string(), volume: z.number().min(0).max(1) }),
  BaseNodeSchema.extend({ kind: z.literal("chapter"), anchorId: z.string().min(1) }),
  BaseNodeSchema.extend({ kind: z.literal("jump"), targetType: z.enum(["chapter", "anchor"]), targetId: z.string().min(1) }),
  BaseNodeSchema.extend({ kind: z.literal("ending"), endingTitle: z.string() }),
]);

export const ChapterDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  order: z.number().int().nonnegative(),
  entryNodeId: z.string().min(1),
});

export const ProjectSchema = z.object({
  schemaVersion: z.literal(3),
  id: z.string(),
  title: z.string(),
  nodes: z.array(StoryNodeSchema),
  chapters: z.array(ChapterDefinitionSchema).min(1),
  defaultChapterId: z.string().min(1),
  edges: z.array(z.object({ id: z.string(), source: z.string(), sourcePort: z.string(), target: z.string() })),
  variables: z.array(z.object({ id: z.string(), name: z.string(), type: z.enum(["number", "string", "boolean"]), initialValue: ValueSchema })),
  assets: z.array(z.object({ id: z.string(), name: z.string(), type: z.string(), size: z.number(), url: z.string() })).default([]),
  display: DisplaySettingsSchema.default({ aspectRatio: "16:9", width: 1920, height: 1080 }),
  ui: z.object({ accent: z.string(), dialogueOpacity: z.number().min(0).max(1), buttonRadius: z.number().min(0) }),
}).superRefine((project, context) => {
  const chapterIds = new Set(project.chapters.map(chapter => chapter.id));
  if (!chapterIds.has(project.defaultChapterId)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["defaultChapterId"], message: "Default chapter is not declared" });
  }
  project.nodes.forEach((node, index) => {
    if (!chapterIds.has(node.chapterId)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["nodes", index, "chapterId"], message: "Node chapter is not declared" });
    }
  });
});

export type Project = z.infer<typeof ProjectSchema>;
export type StoryNode = z.infer<typeof StoryNodeSchema>;
export type NodeKind = StoryNode["kind"];
export type ComparisonOperator = z.infer<typeof ComparisonOperatorSchema>;
export type VariableOperation = z.infer<typeof VariableOperationSchema>;

export function createStarterProject(): Project {
  return {
    schemaVersion: 3,
    id: "mist-harbor",
    title: "雾港来信",
    nodes: [
      { id: "start", kind: "start", title: "故事开始", position: { x: 40, y: 165 }, chapterId: "main-story" },
      { id: "opening", kind: "scene", title: "雨夜码头", position: { x: 275, y: 110 }, chapterId: "main-story", mediaUrl: "", speaker: "林夏", dialogue: "那封信，真的来自他吗？", showDialogue: false },
      { id: "choice", kind: "choice", title: "要不要赴约？", position: { x: 515, y: 190 }, chapterId: "main-story", prompt: "你只有几秒作出决定", choices: [{ id: "warehouse", label: "前往旧仓库" }, { id: "call", label: "先联系林夏" }] },
      { id: "ending", kind: "ending", title: "黎明之前", position: { x: 760, y: 115 }, chapterId: "main-story", endingTitle: "未完的来信" },
    ],
    chapters: [{ id: "main-story", name: "主剧情", order: 0, entryNodeId: "start" }],
    defaultChapterId: "main-story",
    edges: [
      { id: "e-start", source: "start", sourcePort: "next", target: "opening" },
      { id: "e-opening", source: "opening", sourcePort: "next", target: "choice" },
      { id: "e-warehouse", source: "choice", sourcePort: "warehouse", target: "ending" },
      { id: "e-call", source: "choice", sourcePort: "call", target: "ending" },
    ],
    variables: [{ id: "affection", name: "林夏好感度", type: "number", initialValue: 0 }],
    assets: [],
    display: { aspectRatio: "16:9", width: 1920, height: 1080 },
    ui: { accent: "#f0b429", dialogueOpacity: 0.86, buttonRadius: 6 },
  };
}

export function createNode(kind: Exclude<NodeKind, "start">, index: number, chapterId = "main-story"): StoryNode {
  const base = { id: `${kind}-${Date.now()}-${index}`, position: { x: 350 + (index % 3) * 170, y: 260 + (index % 2) * 120 }, chapterId };
  if (kind === "scene") return { ...base, kind, title: "新场景", mediaUrl: "", speaker: "角色", dialogue: "输入对白内容", showDialogue: false };
  if (kind === "choice") return { ...base, kind, title: "新选择", prompt: "请选择接下来的行动", choices: [{ id: "option-a", label: "选项一" }, { id: "option-b", label: "选项二" }] };
  if (kind === "timedChoice") return { ...base, kind, title: "限时选择", prompt: "请在时间结束前选择", choices: [{ id: "option-a", label: "选项一" }, { id: "option-b", label: "选项二" }], durationMs: 5000 };
  if (kind === "condition") return { ...base, kind, title: "条件判断", variableId: "affection", operator: "gte", value: 1 };
  if (kind === "setVariable") return { ...base, kind, title: "修改变量", variableId: "affection", operation: "add", value: 1 };
  if (kind === "random") return { ...base, kind, title: "随机分支", branches: [{ id: "branch-a", label: "分支一", weight: 1 }, { id: "branch-b", label: "分支二", weight: 1 }] };
  if (kind === "wait") return { ...base, kind, title: "等待", durationMs: 1000 };
  if (kind === "music") return { ...base, kind, title: "音乐控制", action: "play", assetId: undefined, volume: 0.8 };
  if (kind === "sound") return { ...base, kind, title: "播放音效", assetId: "", volume: 1 };
  if (kind === "chapter") return { ...base, kind, title: "章节入口", anchorId: `chapter-${index + 1}` };
  if (kind === "jump") return { ...base, kind, title: "跳转章节", targetType: "anchor", targetId: "chapter-1" };
  return { ...base, kind: "ending", title: "新结局", endingTitle: "故事结局" };
}
