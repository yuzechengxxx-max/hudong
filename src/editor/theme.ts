import { useEffect, useState } from "react";

export type ThemePreference = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";
const THEME_KEY = "flowfilm-editor-theme";

export function readThemePreference(storage: Pick<Storage, "getItem">): ThemePreference {
  const value = storage.getItem(THEME_KEY);
  return value === "dark" || value === "light" || value === "system" ? value : "system";
}

export function writeThemePreference(storage: Pick<Storage, "setItem">, value: ThemePreference) {
  storage.setItem(THEME_KEY, value);
}

export function resolveTheme(value: ThemePreference, systemDark: boolean): ResolvedTheme {
  return value === "system" ? (systemDark ? "dark" : "light") : value;
}

export function useEditorTheme() {
  const [preference, setPreference] = useState<ThemePreference>(() => readThemePreference(localStorage));
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;
    const handleChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener?.("change", handleChange);
    return () => media.removeEventListener?.("change", handleChange);
  }, []);

  const resolved = resolveTheme(preference, systemDark);
  useEffect(() => {
    writeThemePreference(localStorage, preference);
    document.documentElement.dataset.theme = resolved;
  }, [preference, resolved]);

  return { preference, resolved, setPreference };
}
