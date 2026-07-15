import { useCallback, useEffect, useRef, useState } from "react";
import type { Project } from "../core/project";
import type { ProjectRepository, RecoveryPoint } from "./projectRepository";

export type PersistenceStatus = "dirty" | "saving" | "saved" | "error";

export function useProjectPersistence(project: Project, repository: ProjectRepository) {
  const [status, setStatus] = useState<PersistenceStatus>("dirty");
  const [savedAt, setSavedAt] = useState<Date>();
  const [lastSaveKind, setLastSaveKind] = useState<"manual" | "auto">();
  const [recoveries, setRecoveries] = useState<RecoveryPoint[]>([]);
  const lastSaved = useRef<string | undefined>(undefined);
  const suppressNextAutoSave = useRef(false);

  const refreshRecoveries = useCallback(async () => setRecoveries(await repository.listRecoveries()), [repository]);

  useEffect(() => { void refreshRecoveries(); }, [refreshRecoveries]);
  useEffect(() => {
    setStatus("dirty");
    if (suppressNextAutoSave.current) { suppressNextAutoSave.current = false; return; }
    const serialized = JSON.stringify(project);
    const timer = window.setTimeout(async () => {
      if (serialized === lastSaved.current) { setStatus("saved"); return; }
      setStatus("saving");
      try {
        await repository.saveCurrent(project);
        await repository.createRecovery(project, "interval");
        lastSaved.current = serialized;
        setSavedAt(new Date());
        setLastSaveKind("auto");
        setStatus("saved");
        await refreshRecoveries();
      } catch { setStatus("error"); }
    }, 800);
    return () => window.clearTimeout(timer);
  }, [project, refreshRecoveries, repository]);

  const manualSave = useCallback(async () => {
    setStatus("saving");
    try {
      await repository.saveCurrent(project);
      await repository.createRecovery(project, "manual");
      lastSaved.current = JSON.stringify(project);
      setSavedAt(new Date());
      setLastSaveKind("manual");
      setStatus("saved");
      await refreshRecoveries();
    } catch (error) {
      setStatus("error");
      throw error;
    }
  }, [project, refreshRecoveries, repository]);

  const restore = useCallback(async (id: string) => {
    setStatus("saving");
    try {
      await repository.createRecovery(project, "pre-restore");
      const recovered = await repository.loadRecovery(id);
      await refreshRecoveries();
      lastSaved.current = undefined;
      suppressNextAutoSave.current = true;
      setStatus("dirty");
      return recovered;
    } catch (error) {
      setStatus("error");
      throw error;
    }
  }, [project, refreshRecoveries, repository]);

  return { status, savedAt, lastSaveKind, recoveries, manualSave, restore, refreshRecoveries };
}
