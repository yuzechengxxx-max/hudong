import { z } from "zod";

const BaseNodeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  position: z.object({ x: z.number(), y: z.number() }),
});

export const StoryNodeSchema = z.discriminatedUnion("kind", [
  BaseNodeSchema.extend({ kind: z.literal("start") }),
  BaseNodeSchema.extend({
    kind: z.literal("scene"),
    mediaUrl: z.string(),
    speaker: z.string(),
    dialogue: z.string(),
  }),
  BaseNodeSchema.extend({
    kind: z.literal("choice"),
    prompt: z.string(),
    choices: z.array(z.object({ id: z.string(), label: z.string() })).min(2),
  }),
  BaseNodeSchema.extend({
    kind: z.literal("condition"),
    variableId: z.string(),
    operator: z.enum(["eq", "gte", "lte"]),
    value: z.union([z.string(), z.number(), z.boolean()]),
  }),
  BaseNodeSchema.extend({
    kind: z.literal("setVariable"),
    variableId: z.string(),
    operation: z.enum(["set", "add"]),
    value: z.union([z.string(), z.number(), z.boolean()]),
  }),
  BaseNodeSchema.extend({ kind: z.literal("ending"), endingTitle: z.string() }),
]);

export const ProjectSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  title: z.string(),
  nodes: z.array(StoryNodeSchema),
  edges: z.array(z.object({
    id: z.string(),
    source: z.string(),
    sourcePort: z.string(),
    target: z.string(),
  })),
  variables: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(["number", "string", "boolean"]),
    initialValue: z.union([z.string(), z.number(), z.boolean()]),
  })),
  ui: z.object({
    accent: z.string(),
    dialogueOpacity: z.number().min(0).max(1),
    buttonRadius: z.number().min(0),
  }),
});

export type Project = z.infer<typeof ProjectSchema>;
export type StoryNode = z.infer<typeof StoryNodeSchema>;

export function createStarterProject(): Project {
  return {
    schemaVersion: 1,
    id: "mist-harbor",
    title: "雾港来信",
    nodes: [
      { id: "start", kind: "start", title: "故事开始", position: { x: 40, y: 160 } },
      { id: "opening", kind: "scene", title: "雨夜码头", position: { x: 290, y: 120 }, mediaUrl: "", speaker: "林夏", dialogue: "那封信，真的来自他吗？" },
      { id: "choice", kind: "choice", title: "要不要赴约？", position: { x: 560, y: 120 }, prompt: "你只有几秒作出决定", choices: [{ id: "warehouse", label: "前往旧仓库" }, { id: "call", label: "先联系林夏" }] },
      { id: "ending", kind: "ending", title: "黎明之前", position: { x: 850, y: 120 }, endingTitle: "未完的来信" },
    ],
    edges: [
      { id: "e-start", source: "start", sourcePort: "next", target: "opening" },
      { id: "e-opening", source: "opening", sourcePort: "next", target: "choice" },
      { id: "e-warehouse", source: "choice", sourcePort: "warehouse", target: "ending" },
      { id: "e-call", source: "choice", sourcePort: "call", target: "ending" },
    ],
    variables: [{ id: "affection", name: "林夏好感度", type: "number", initialValue: 0 }],
    ui: { accent: "#f0b429", dialogueOpacity: 0.86, buttonRadius: 6 },
  };
}
