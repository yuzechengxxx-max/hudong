import type { Project } from "../core/project";
import { loadProject } from "../core/projectMigration";

export type RecoveryReason = "manual" | "interval" | "migration" | "pre-restore";
export type RecoveryPoint = { id: string; createdAt: string; reason: RecoveryReason; nodeCount: number; chapterCount: number };

export interface ProjectRepository {
  loadCurrent(): Promise<Project | null>;
  saveCurrent(project: Project): Promise<void>;
  createRecovery(project: Project, reason: RecoveryReason, now?: Date): Promise<RecoveryPoint>;
  listRecoveries(): Promise<RecoveryPoint[]>;
  loadRecovery(id: string): Promise<Project>;
}

type StoredRecovery = RecoveryPoint & { project: Project };
const CURRENT_KEY = "flowfilm-project";
const RECOVERY_KEY = "flowfilm-recoveries-v1";

export function createBrowserProjectRepository(storage: Storage = localStorage): ProjectRepository {
  return createStorageRepository({
    get: key => storage.getItem(key),
    set: (key, value) => storage.setItem(key, value),
  });
}

export function createMemoryProjectRepository(): ProjectRepository {
  const values = new Map<string, string>();
  return createStorageRepository({ get: key => values.get(key) ?? null, set: (key, value) => values.set(key, value) });
}

function createStorageRepository(storage: { get(key: string): string | null; set(key: string, value: string): void }): ProjectRepository {
  const readRecoveries = (): StoredRecovery[] => {
    const raw = storage.get(RECOVERY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredRecovery[];
    return parsed.map(point => ({ ...point, project: loadProject(point.project) }));
  };
  return {
    async loadCurrent() {
      const raw = storage.get(CURRENT_KEY);
      return raw ? structuredClone(loadProject(JSON.parse(raw))) : null;
    },
    async saveCurrent(project) {
      storage.set(CURRENT_KEY, JSON.stringify(loadProject(structuredClone(project))));
    },
    async createRecovery(project, reason, now = new Date()) {
      const createdAt = now.toISOString();
      const point: StoredRecovery = {
        id: `recovery-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt,
        reason,
        nodeCount: project.nodes.length,
        chapterCount: project.chapters.length,
        project: structuredClone(loadProject(project)),
      };
      const recoveries = [...readRecoveries(), point];
      while (recoveries.length > 10) {
        const automatic = recoveries
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.reason !== "manual")
          .sort((a, b) => a.item.createdAt.localeCompare(b.item.createdAt))[0];
        if (automatic) recoveries.splice(automatic.index, 1);
        else recoveries.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).shift();
      }
      storage.set(RECOVERY_KEY, JSON.stringify(recoveries));
      return stripProject(point);
    },
    async listRecoveries() {
      return readRecoveries().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(stripProject);
    },
    async loadRecovery(id) {
      const point = readRecoveries().find(item => item.id === id);
      if (!point) throw new Error(`Unknown recovery point: ${id}`);
      return structuredClone(point.project);
    },
  };
}

function stripProject({ project: _project, ...point }: StoredRecovery): RecoveryPoint {
  return point;
}
