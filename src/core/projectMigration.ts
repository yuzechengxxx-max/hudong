import { ProjectSchema, type Project } from "./project";

type VersionedProject = { schemaVersion?: unknown } & Record<string, unknown>;

function readSchemaVersion(input: unknown): unknown {
  return input && typeof input === "object" ? (input as VersionedProject).schemaVersion : undefined;
}

function migrateV1ToV2(input: VersionedProject): unknown {
  const migrated = structuredClone(input);
  return { ...migrated, schemaVersion: 2 };
}

export function loadProject(input: unknown): Project {
  const version = readSchemaVersion(input);
  if (version === 1) return ProjectSchema.parse(migrateV1ToV2(input as VersionedProject));
  if (version === 2) return ProjectSchema.parse(input);
  throw new Error(`不支持的项目格式版本：${String(version)}`);
}
