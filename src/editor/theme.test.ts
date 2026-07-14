import { describe, expect, it, vi } from "vitest";
import { readThemePreference, resolveTheme, writeThemePreference } from "./theme";

describe("editor theme", () => {
  it("defaults to system and resolves dark media", () => {
    expect(readThemePreference({ getItem: () => null })).toBe("system");
    expect(resolveTheme("system", true)).toBe("dark");
  });

  it("keeps explicit light independent of the system", () => {
    expect(resolveTheme("light", true)).toBe("light");
  });

  it("persists the editor preference", () => {
    const setItem = vi.fn();
    writeThemePreference({ setItem }, "dark");
    expect(setItem).toHaveBeenCalledWith("flowfilm-editor-theme", "dark");
  });
});
