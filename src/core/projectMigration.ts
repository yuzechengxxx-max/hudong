import { ProjectSchema, type Project } from "./project";

type VersionedProject = { schemaVersion?: unknown } & Record<string, unknown>;

function readSchemaVersion(input: unknown): unknown {
  return input && typeof input === "object" ? (input as VersionedProject).schemaVersion : undefined;
}

function migrateV1ToV2(input: VersionedProject): unknown {
  const migrated = structuredClone(input);
  return { ...migrated, schemaVersion: 2 };
}

function migrateV2ToV3(input: VersionedProject): unknown {
  const migrated = structuredClone(input) as VersionedProject & { nodes?: Array<Record<string, unknown>> };
  const nodes = Array.isArray(migrated.nodes) ? migrated.nodes.map(node => {
    const legacyTarget = node.chapterId;
    const base = { ...node, chapterId: "main-story" };
    if (node.kind === "chapter") {
      const { chapterId: _chapterId, ...chapterNode } = base;
      return { ...chapterNode, chapterId: "main-story", anchorId: legacyTarget };
    }
    if (node.kind === "jump") {
      return { ...base, targetType: "anchor", targetId: legacyTarget };
    }
    return base;
  }) : [];
  const entryNodeId = (nodes.find(node => (node as Record<string, unknown>).kind === "start") as Record<string, unknown> | undefined)?.id as string | undefined;
  return {
    ...migrated,
    schemaVersion: 3,
    nodes,
    chapters: [{ id: "main-story", name: "Main Story", order: 0, entryNodeId }],
    defaultChapterId: "main-story",
  };
}

export function loadProject(input: unknown): Project {
  const version = readSchemaVersion(input);
  if (version === 1) return ProjectSchema.parse(migrateV2ToV3(migrateV1ToV2(input as VersionedProject) as VersionedProject));
  if (version === 2) return ProjectSchema.parse(migrateV2ToV3(input as VersionedProject));
  if (version === 3) return ProjectSchema.parse(input);
  throw new Error(`不支持的项目格式版本：${String(version)}`);
}
