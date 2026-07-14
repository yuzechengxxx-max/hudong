import type { Project } from "../core/project";

export function persistProject(storage: Storage, project: Project) {
  storage.setItem("flowfilm-project", JSON.stringify(project));
  return new Date();
}
