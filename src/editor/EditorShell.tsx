import type { ReactNode } from "react";

export function EditorShell({ children }: { children: ReactNode }) {
  return <div className="app-shell editor-shell">{children}</div>;
}
