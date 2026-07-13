import { z } from "zod";

const PositionSchema = z.object({ x: z.number(), y: z.number() });
const BaseNodeSchema = z.object({ id: z.string().min(1), title: z.string().min(1), position: PositionSchema });
const ValueSchema = z.union([z.string(), z.number(), z.boolean()]);

export const StoryNodeSchema = z.discriminatedUnion("kind", [
  BaseNodeSchema.extend({ kind: z.literal("start") }),
  BaseNodeSchema.extend({ kind: z.literal("scene"), assetId: z.string().optional(), mediaUrl: z.string(), speaker: z.string(), dialogue: z.string(), showDialogue: z.boolean().default(true) }),
  BaseNodeSchema.extend({ kind: z.literal("choice"), prompt: z.string(), choices: z.array(z.object({ id: z.string(), label: z.string() })).min(1) }),
  BaseNodeSchema.extend({ kind: z.literal("condition"), variableId: z.string(), operator: z.enum(["eq", "gte", "lte"]), value: ValueSchema }),
  BaseNodeSchema.extend({ kind: z.literal("setVariable"), variableId: z.string(), operation: z.enum(["set", "add"]), value: ValueSchema }),
  BaseNodeSchema.extend({ kind: z.literal("ending"), endingTitle: z.string() }),
]);

export const ProjectSchema = z.object({
  schemaVersion: z.literal(1), id: z.string(), title: z.string(),
  nodes: z.array(StoryNodeSchema),
  edges: z.array(z.object({ id: z.string(), source: z.string(), sourcePort: z.string(), target: z.string() })),
  variables: z.array(z.object({ id: z.string(), name: z.string(), type: z.enum(["number", "string", "boolean"]), initialValue: ValueSchema })),
  assets: z.array(z.object({ id: z.string(), name: z.string(), type: z.string(), size: z.number(), url: z.string() })).default([]),
  ui: z.object({ accent: z.string(), dialogueOpacity: z.number().min(0).max(1), buttonRadius: z.number().min(0) }),
});

export type Project = z.infer<typeof ProjectSchema>;
export type StoryNode = z.infer<typeof StoryNodeSchema>;
export type NodeKind = StoryNode["kind"];

export function createStarterProject(): Project {
  return {
    schemaVersion: 1, id: "mist-harbor", title: "雾港来信",
    nodes: [
      { id: "start", kind: "start", title: "故事开始", position: { x: 40, y: 165 } },
      { id: "opening", kind: "scene", title: "雨夜码头", position: { x: 275, y: 110 }, mediaUrl: "", speaker: "林夏", dialogue: "那封信，真的来自他吗？", showDialogue: false },
      { id: "choice", kind: "choice", title: "要不要赴约？", position: { x: 515, y: 190 }, prompt: "你只有几秒作出决定", choices: [{ id: "warehouse", label: "前往旧仓库" }, { id: "call", label: "先联系林夏" }] },
      { id: "ending", kind: "ending", title: "黎明之前", position: { x: 760, y: 115 }, endingTitle: "未完的来信" },
    ],
    edges: [
      { id: "e-start", source: "start", sourcePort: "next", target: "opening" },
      { id: "e-opening", source: "opening", sourcePort: "next", target: "choice" },
      { id: "e-warehouse", source: "choice", sourcePort: "warehouse", target: "ending" },
      { id: "e-call", source: "choice", sourcePort: "call", target: "ending" },
    ],
    variables: [{ id: "affection", name: "林夏好感度", type: "number", initialValue: 0 }],
    assets: [],
    ui: { accent: "#f0b429", dialogueOpacity: 0.86, buttonRadius: 6 },
  };
}

export function createNode(kind: Exclude<NodeKind, "start">, index: number): StoryNode {
  const base = { id: `${kind}-${Date.now()}-${index}`, position: { x: 350 + (index % 3) * 170, y: 260 + (index % 2) * 120 } };
  if (kind === "scene") return { ...base, kind, title: "新场景", mediaUrl: "", speaker: "角色", dialogue: "输入对白内容", showDialogue: false };
  if (kind === "choice") return { ...base, kind, title: "新选择", prompt: "请选择接下来的行动", choices: [{ id: "option-a", label: "选项一" }, { id: "option-b", label: "选项二" }] };
  if (kind === "condition") return { ...base, kind, title: "条件判断", variableId: "affection", operator: "gte", value: 1 };
  if (kind === "setVariable") return { ...base, kind, title: "修改变量", variableId: "affection", operation: "add", value: 1 };
  return { ...base, kind: "ending", title: "新结局", endingTitle: "故事结局" };
}
