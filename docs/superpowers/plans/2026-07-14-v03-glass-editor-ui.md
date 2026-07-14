# FlowFilm v0.3 Glass Editor UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild FlowFilm's browser editor shell as the approved glass workbench with complete dark, light, and system themes while preserving every existing editor workflow.

**Architecture:** A theme hook owns editor-local theme preference and resolves system color changes. Small reusable UI primitives own control and glass-panel semantics, while a new shell layer renders the top tool island, workspace rail, inspector frame, and floating status. Existing project/runtime state and editor callbacks remain in `App`.

**Tech Stack:** React 19, TypeScript 5.8, React Flow 12, Lucide React, CSS custom properties, Vitest, Testing Library, Playwright/Edge, Vite 7.

---

## File Map

- Create `src/editor/theme.ts`: theme preference storage, resolution, and media-query subscription.
- Create `src/editor/theme.test.ts`: deterministic theme behavior tests.
- Create `src/editor/ui.tsx`: `IconButton`, `SegmentedControl`, `GlassPanel`, `PanelHeader`, and `StatusBadge`.
- Create `src/editor/ui.test.tsx`: primitive accessibility and state tests.
- Create `src/editor/EditorShell.tsx`: top tool island, workspace rail, inspector frame, and status float.
- Modify `src/App.tsx`: compose the new shell without moving project/runtime ownership.
- Modify `src/editor/ProjectSettings.tsx`: real theme selector using the shared segmented control.
- Modify `src/editor/StoryGraph.tsx`: revised node chrome and canvas overlay class hooks.
- Modify `src/styles.css`: replace accumulated overrides with tokenized dark/light glass workbench styles.
- Modify `src/App.test.tsx`: theme, shell, tooltip, drawer, and regression tests.
- Regenerate `outputs/flowfilm-engine.html`.

### Task 1: Theme Preference and System Resolution

**Files:**
- Create: `src/editor/theme.ts`
- Create: `src/editor/theme.test.ts`

- [ ] **Step 1: Write failing theme tests**

```ts
import { describe, expect, it, vi } from "vitest";
import { resolveTheme, readThemePreference, writeThemePreference } from "./theme";

describe("editor theme", () => {
  it("defaults to system and resolves dark media", () => {
    expect(readThemePreference({ getItem: () => null } as Storage)).toBe("system");
    expect(resolveTheme("system", true)).toBe("dark");
  });

  it("keeps explicit light independent of the system", () => {
    expect(resolveTheme("light", true)).toBe("light");
  });

  it("persists the editor preference", () => {
    const setItem = vi.fn();
    writeThemePreference({ setItem } as unknown as Storage, "dark");
    expect(setItem).toHaveBeenCalledWith("flowfilm-editor-theme", "dark");
  });
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node_modules\.bin\vitest.cmd run src\editor\theme.test.ts --configLoader runner`

Expected: FAIL because `theme.ts` does not exist.

- [ ] **Step 3: Implement theme functions and hook**

```ts
export type ThemePreference = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";
const KEY = "flowfilm-editor-theme";

export function readThemePreference(storage: Pick<Storage, "getItem">): ThemePreference {
  const value = storage.getItem(KEY);
  return value === "dark" || value === "light" || value === "system" ? value : "system";
}

export function writeThemePreference(storage: Pick<Storage, "setItem">, value: ThemePreference) {
  storage.setItem(KEY, value);
}

export function resolveTheme(value: ThemePreference, systemDark: boolean): ResolvedTheme {
  return value === "system" ? (systemDark ? "dark" : "light") : value;
}
```

Add `useEditorTheme()` using `window.matchMedia("(prefers-color-scheme: dark)")`, its `change` event, and `document.documentElement.dataset.theme`.

- [ ] **Step 4: Run and verify GREEN**

Run: `node_modules\.bin\vitest.cmd run src\editor\theme.test.ts --configLoader runner`

Expected: all theme tests PASS.

- [ ] **Step 5: Commit**

```powershell
git --git-dir=work/repo.git --work-tree=. add src/editor/theme.ts src/editor/theme.test.ts
git --git-dir=work/repo.git --work-tree=. commit -m "feat: add editor theme system"
```

### Task 2: Shared Editor UI Primitives

**Files:**
- Create: `src/editor/ui.tsx`
- Create: `src/editor/ui.test.tsx`

- [ ] **Step 1: Write failing primitive behavior tests through App**

```tsx
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { IconButton, SegmentedControl } from "./ui";

it("names icon-only commands and exposes a tooltip", () => {
  render(<IconButton label="素材"><span>icon</span></IconButton>);
  expect(screen.getByRole("button", { name: "素材" })).toHaveAttribute("title", "素材");
});

it("marks the selected segment", () => {
  render(<SegmentedControl ariaLabel="主题" value="dark" options={[{ value: "dark", label: "深色" }, { value: "light", label: "浅色" }]} onChange={() => {}}/>);
  expect(screen.getByRole("button", { name: "深色" })).toHaveAttribute("aria-pressed", "true");
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node_modules\.bin\vitest.cmd run src\editor\ui.test.tsx --configLoader runner`

Expected: FAIL because `ui.tsx` does not exist.

- [ ] **Step 3: Implement primitives**

```tsx
export function IconButton({ label, active, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return <button {...props} aria-label={props["aria-label"] ?? label} title={label} data-active={active || undefined} className={`ui-icon-button ${props.className ?? ""}`}/>;
}

export function GlassPanel({ className = "", ...props }: React.HTMLAttributes<HTMLElement>) {
  return <section {...props} className={`glass-panel ${className}`}/>;
}

export function StatusBadge({ tone = "neutral", ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral"|"success"|"warning"|"danger" }) {
  return <span {...props} data-tone={tone} className="status-badge"/>;
}
```

Implement `SegmentedControl<T>` with `aria-pressed`, `PanelHeader`, and stable class names. Do not add a component library dependency.

- [ ] **Step 4: Run App tests**

Run: `node_modules\.bin\vitest.cmd run src\editor\ui.test.tsx --configLoader runner`

Expected: primitive tests PASS.

- [ ] **Step 5: Commit primitives**

```powershell
git --git-dir=work/repo.git --work-tree=. add src/editor/ui.tsx src/editor/ui.test.tsx
git --git-dir=work/repo.git --work-tree=. commit -m "feat: add editor UI primitives"
```

### Task 3: Glass Workbench Shell

**Files:**
- Create: `src/editor/EditorShell.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Add failing shell structure tests**

```ts
it("renders the glass workbench shell around the graph", () => {
  render(<App/>);
  expect(screen.getByTestId("tool-island")).toBeVisible();
  expect(screen.getByRole("navigation", { name: "工作区" })).toBeVisible();
  expect(screen.getByTestId("status-float")).toBeVisible();
  expect(screen.getByTestId("story-graph")).toBeVisible();
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node_modules\.bin\vitest.cmd run src\App.test.tsx --configLoader runner -t "glass workbench shell"`

Expected: FAIL because shell landmarks are absent.

- [ ] **Step 3: Implement `EditorShell`**

Define explicit slots:

```tsx
type EditorShellProps = {
  toolbar: React.ReactNode;
  rail: React.ReactNode;
  canvas: React.ReactNode;
  inspector: React.ReactNode;
  status: React.ReactNode;
  drawer?: React.ReactNode;
};

export function EditorShell(props: EditorShellProps) {
  return <div className="editor-shell">
    <header data-testid="tool-island" className="tool-island glass-panel">{props.toolbar}</header>
    <nav aria-label="工作区" className="workspace-rail glass-panel">{props.rail}</nav>
    <main className="editor-canvas">{props.canvas}</main>
    <aside className="inspector-float glass-panel">{props.inspector}</aside>
    <footer data-testid="status-float" className="status-float glass-panel">{props.status}</footer>
    {props.drawer}
  </div>;
}
```

Compose current toolbar commands, `StoryGraph`, inspector, drawer, timeline, and status through slots. Preserve accessible labels used by existing tests.

- [ ] **Step 4: Verify shell and existing workflows**

Run: `node_modules\.bin\vitest.cmd run src\App.test.tsx --configLoader runner`

Expected: all App tests PASS, including the shell and icon command test.

- [ ] **Step 5: Commit**

```powershell
git --git-dir=work/repo.git --work-tree=. add src/editor/EditorShell.tsx src/App.tsx src/App.test.tsx
git --git-dir=work/repo.git --work-tree=. commit -m "feat: rebuild editor glass shell"
```

### Task 4: Theme Controls and Panel Migration

**Files:**
- Modify: `src/editor/ProjectSettings.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Write failing theme integration tests**

```ts
it("switches editor themes and persists the preference", async () => {
  render(<App/>);
  await userEvent.click(screen.getByRole("button", { name: "项目设置" }));
  await userEvent.click(screen.getByRole("button", { name: "浅色" }));
  expect(document.documentElement).toHaveAttribute("data-theme", "light");
  expect(localStorage.getItem("flowfilm-editor-theme")).toBe("light");
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node_modules\.bin\vitest.cmd run src\App.test.tsx --configLoader runner -t "switches editor themes"`

Expected: FAIL because the settings panel only contains explanatory text.

- [ ] **Step 3: Integrate theme hook and segmented control**

Call `useEditorTheme()` once in `App`, pass preference and setter into `ProjectSettings`, and render:

```tsx
<SegmentedControl
  ariaLabel="编辑器主题"
  value={themePreference}
  options={[{ value: "dark", label: "深色" }, { value: "light", label: "浅色" }, { value: "system", label: "自动" }]}
  onChange={setThemePreference}
/>
```

Mirror the selector in the status float on wide screens.

- [ ] **Step 4: Run theme and App suites**

Run: `node_modules\.bin\vitest.cmd run src\editor\theme.test.ts src\App.test.tsx --configLoader runner`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git --git-dir=work/repo.git --work-tree=. add src/editor/ProjectSettings.tsx src/App.tsx src/App.test.tsx
git --git-dir=work/repo.git --work-tree=. commit -m "feat: add dark light and system themes"
```

### Task 5: Tokenized Visual System and Node Chrome

**Files:**
- Modify: `src/styles.css`
- Modify: `src/editor/StoryGraph.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Add failing semantic class tests**

```ts
it("uses glass panels and neutral typed nodes", () => {
  const { container } = render(<App/>);
  expect(screen.getByTestId("tool-island")).toHaveClass("glass-panel");
  expect(container.querySelector(".graph-node[data-kind='choice']")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node_modules\.bin\vitest.cmd run src\App.test.tsx --configLoader runner -t "neutral typed nodes"`

Expected: FAIL because graph nodes lack `data-kind`.

- [ ] **Step 3: Add node semantics and replace CSS with theme tokens**

Add `data-kind={story.kind}` to `.graph-node`. Define complete token sets:

```css
:root,[data-theme="dark"]{--app:#0d1117;--canvas:#111820;--glass:rgba(34,43,54,.88);--panel:#202832;--control:#29323c;--text:#eef2f6;--muted:#8d98a4;--border:rgba(255,255,255,.13);--shadow:0 18px 42px rgba(0,0,0,.56)}
[data-theme="light"]{--app:#e9edf1;--canvas:#edf0f3;--glass:rgba(255,255,255,.9);--panel:#f7f8fa;--control:#fff;--text:#20252b;--muted:#727d88;--border:#cbd1d7;--shadow:0 18px 42px rgba(38,53,66,.16)}
```

Style tool island, rail, floating inspector, drawers, preview, status, nodes, inputs, minimap, selection box, handles, timeline, and modals. Use `backdrop-filter` only on `.glass-panel`; include opaque fallbacks. Keep node type colors on a 3px strip and ports.

- [ ] **Step 4: Run tests and scan styling constraints**

Run: `node_modules\.bin\vitest.cmd run src\App.test.tsx --configLoader runner`

Run: `rg -n "border-radius:\s*(1[0-9]|[2-9][0-9])px|letter-spacing:\s*-|font-size:\s*clamp" src/styles.css`

Expected: tests PASS; scan returns no prohibited oversized radii, negative letter spacing, or viewport-scaled type.

- [ ] **Step 5: Commit**

```powershell
git --git-dir=work/repo.git --work-tree=. add src/styles.css src/editor/StoryGraph.tsx src/App.test.tsx
git --git-dir=work/repo.git --work-tree=. commit -m "feat: apply glass workbench visual system"
```

### Task 6: Responsive QA, Regression Verification, and Publish

**Files:**
- Regenerate: `outputs/flowfilm-engine.html`

- [ ] **Step 1: Run complete verification**

Run: `node_modules\.bin\vitest.cmd run --configLoader runner`

Run App separately if the Windows worker omits it: `node_modules\.bin\vitest.cmd run src\App.test.tsx --configLoader runner --reporter verbose`

Run: `node_modules\.bin\tsc.cmd -b --pretty false`

Run: `node_modules\.bin\vite.cmd build --configLoader runner`

Expected: all tests, typecheck, and production build PASS.

- [ ] **Step 2: Serve the production build**

Run the bundled Python runtime:

```powershell
& 'C:\Users\yu\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m http.server 4180 --bind 127.0.0.1 --directory dist
```

Expected: `http://127.0.0.1:4180/` serves the built app.

- [ ] **Step 3: Run Edge/Playwright visual QA**

Capture dark and light screenshots at `1440x900`, plus a narrow screenshot at `900x700`. Verify:

1. Tool island, workspace rail, inspector, preview, minimap, and status do not overlap incoherently.
2. Text and controls remain inside their containers.
3. Theme switching changes all editor surfaces.
4. Node drag, marquee, connection, asset drawer, settings, save, and preview still work.
5. Console contains no relevant errors or warnings.
6. Rendered appearance matches `v03-glass-standalone.html`; record and fix visible deviations.

- [ ] **Step 4: Regenerate portable build**

Run: `node scripts\inline-build.mjs`

Expected: `outputs/flowfilm-engine.html` contains the v0.3 shell and theme code.

- [ ] **Step 5: Commit and push**

```powershell
git --git-dir=work/repo.git --work-tree=. add outputs/flowfilm-engine.html
git --git-dir=work/repo.git --work-tree=. commit -m "build: publish v0.3 glass editor UI"
git --git-dir=work/repo.git --work-tree=. push origin HEAD:main
```

If automated push approval fails, give this exact command once:

```powershell
git --git-dir="C:\Users\yu\Documents\Codex\2026-07-13\ban\work\repo.git" --work-tree="C:\Users\yu\Documents\Codex\2026-07-13\ban" push origin HEAD:main
```
