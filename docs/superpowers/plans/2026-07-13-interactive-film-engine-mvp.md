# Interactive Film Engine MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-local MVP that lets a zero-code creator edit a branching interactive film, preview it, persist the project, diagnose graph errors, customize its basic player UI, and export a playable static web package.

**Architecture:** Use a TypeScript monorepo with a platform-independent engine package, a React editor, and a lightweight React player. The editor mutates projects through commands, persists through an adapter interface, and drives the same runtime used by exported works.

**Tech Stack:** pnpm workspaces, React 19, TypeScript, Vite, React Flow, Zustand, Zod, Dexie/IndexedDB, JSZip, Vitest, Testing Library, Playwright, Lucide React.

---

## Delivery Slices

This plan implements the first complete vertical slice. Later plans will deepen media timeline editing, responsive UI composition, advanced project recovery, desktop adapters, plugins, and cloud collaboration without changing the contracts established here.

## File Map

```text
package.json                         workspace scripts
pnpm-workspace.yaml                 package discovery
tsconfig.base.json                  shared TypeScript rules
apps/editor/                        creator-facing React application
apps/player/                        standalone exported player shell
packages/project-schema/            versioned project types and Zod validation
packages/engine-core/               deterministic graph runtime and diagnostics
packages/editor-core/               commands, history and project mutations
packages/storage-browser/           IndexedDB project repository
packages/export-web/                static web package generation
tests/e2e/                          creator-to-export browser workflows
```

### Task 1: Bootstrap The Workspace

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `apps/editor/package.json`
- Create: `apps/editor/index.html`
- Create: `apps/editor/src/main.tsx`
- Create: `apps/editor/src/App.tsx`
- Create: `apps/player/package.json`
- Create: `packages/project-schema/package.json`
- Create: `packages/engine-core/package.json`
- Create: `packages/editor-core/package.json`
- Create: `packages/storage-browser/package.json`
- Create: `packages/export-web/package.json`

- [ ] **Step 1: Initialize source control and workspace manifests**

Run: `git init`

Create root scripts that run all checks:

```json
{
  "name": "flowfilm-engine",
  "private": true,
  "packageManager": "pnpm@10.12.1",
  "scripts": {
    "dev": "pnpm --filter @flowfilm/editor dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck",
    "e2e": "playwright test"
  },
  "devDependencies": {
    "@playwright/test": "^1.53.2",
    "typescript": "^5.8.3",
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 2: Add the minimal editor entry point**

```tsx
// apps/editor/src/App.tsx
export function App() {
  return <main aria-label="互动影游编辑器">FlowFilm Engine</main>;
}
```

- [ ] **Step 3: Install dependencies and verify the shell**

Run: `pnpm install && pnpm typecheck && pnpm build`

Expected: dependency installation succeeds and both applications build without TypeScript errors.

- [ ] **Step 4: Commit the bootstrap**

```bash
git add .
git commit -m "chore: bootstrap flowfilm workspace"
```

### Task 2: Define The Versioned Project Schema

**Files:**
- Create: `packages/project-schema/src/project.ts`
- Create: `packages/project-schema/src/nodes.ts`
- Create: `packages/project-schema/src/ui.ts`
- Create: `packages/project-schema/src/index.ts`
- Test: `packages/project-schema/src/project.test.ts`

- [ ] **Step 1: Write a failing schema test**

```ts
import { describe, expect, it } from "vitest";
import { ProjectSchema, createStarterProject } from "./index";

describe("ProjectSchema", () => {
  it("accepts the starter project and rejects dangling edge data", () => {
    expect(ProjectSchema.parse(createStarterProject()).schemaVersion).toBe(1);
    const invalid = { ...createStarterProject(), edges: [{ id: "e1" }] };
    expect(() => ProjectSchema.parse(invalid)).toThrow();
  });
});
```

- [ ] **Step 2: Run the test and confirm failure**

Run: `pnpm --filter @flowfilm/project-schema test`

Expected: FAIL because `ProjectSchema` and `createStarterProject` do not exist.

- [ ] **Step 3: Implement stable IDs and discriminated node types**

```ts
export type NodeKind = "start" | "scene" | "choice" | "condition" | "setVariable" | "ending";

export interface StoryEdge {
  id: string;
  source: string;
  sourcePort: string;
  target: string;
}

export interface Project {
  schemaVersion: 1;
  id: string;
  title: string;
  nodes: StoryNode[];
  edges: StoryEdge[];
  variables: VariableDefinition[];
  assets: AssetReference[];
  ui: PlayerUiConfig;
}
```

Use Zod discriminated unions for each node payload, including choice labels, condition operands, variable operations, media resource IDs, and ending titles. `createStarterProject()` must return one start node connected to a sample scene and choice.

- [ ] **Step 4: Run schema tests**

Run: `pnpm --filter @flowfilm/project-schema test`

Expected: PASS.

- [ ] **Step 5: Commit the schema**

```bash
git add packages/project-schema
git commit -m "feat: define versioned project schema"
```

### Task 3: Implement The Deterministic Runtime

**Files:**
- Create: `packages/engine-core/src/runtime.ts`
- Create: `packages/engine-core/src/conditions.ts`
- Create: `packages/engine-core/src/index.ts`
- Test: `packages/engine-core/src/runtime.test.ts`

- [ ] **Step 1: Write failing runtime tests**

```ts
it("takes a selected choice and applies variable changes", () => {
  const runtime = createRuntime(choiceFixture, { affection: 2 });
  runtime.start();
  runtime.choose("trust-her");
  expect(runtime.snapshot()).toMatchObject({ currentNodeId: "warehouse", variables: { affection: 3 } });
});

it("chooses the matching condition branch", () => {
  const runtime = createRuntime(conditionFixture, { clues: 4 });
  expect(runtime.start().currentNodeId).toBe("secret-ending");
});
```

- [ ] **Step 2: Verify the tests fail**

Run: `pnpm --filter @flowfilm/engine-core test`

Expected: FAIL because no runtime exists.

- [ ] **Step 3: Implement the runtime state machine**

```ts
export interface RuntimeSnapshot {
  currentNodeId: string | null;
  variables: Record<string, string | number | boolean>;
  visitedNodeIds: string[];
  status: "idle" | "playing" | "awaiting-choice" | "ended" | "error";
}

export interface StoryRuntime {
  start(nodeId?: string): RuntimeSnapshot;
  advance(): RuntimeSnapshot;
  choose(portId: string): RuntimeSnapshot;
  restore(snapshot: RuntimeSnapshot): RuntimeSnapshot;
  snapshot(): RuntimeSnapshot;
}
```

Automatic nodes must execute until a scene, choice, or ending becomes visible. Add a traversal guard of 1,000 automatic transitions and return an explicit runtime error for cycles that never yield control.

- [ ] **Step 4: Run runtime and type checks**

Run: `pnpm --filter @flowfilm/engine-core test && pnpm --filter @flowfilm/engine-core typecheck`

Expected: PASS.

- [ ] **Step 5: Commit runtime core**

```bash
git add packages/engine-core
git commit -m "feat: add deterministic story runtime"
```

### Task 4: Add Project Diagnostics

**Files:**
- Create: `packages/engine-core/src/diagnostics.ts`
- Test: `packages/engine-core/src/diagnostics.test.ts`

- [ ] **Step 1: Write failing diagnostics tests**

```ts
it("reports publishing blockers and locatable warnings", () => {
  const issues = diagnoseProject(brokenProject);
  expect(issues).toContainEqual(expect.objectContaining({ code: "missing-entry", severity: "error" }));
  expect(issues).toContainEqual(expect.objectContaining({ code: "unreachable-node", severity: "warning", nodeId: "orphan" }));
});
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter @flowfilm/engine-core test diagnostics`

Expected: FAIL because `diagnoseProject` is missing.

- [ ] **Step 3: Implement graph and asset checks**

```ts
export interface DiagnosticIssue {
  code: "missing-entry" | "dangling-edge" | "missing-output" | "unreachable-node" | "missing-asset";
  severity: "error" | "warning";
  message: string;
  nodeId?: string;
  assetId?: string;
}
```

Use graph traversal from the single start node. Scene, choice, condition and variable nodes require valid outputs; ending nodes do not.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @flowfilm/engine-core test`

Expected: PASS.

- [ ] **Step 5: Commit diagnostics**

```bash
git add packages/engine-core
git commit -m "feat: diagnose invalid story graphs"
```

### Task 5: Implement Commands, Undo And Redo

**Files:**
- Create: `packages/editor-core/src/commands.ts`
- Create: `packages/editor-core/src/history.ts`
- Create: `packages/editor-core/src/index.ts`
- Test: `packages/editor-core/src/history.test.ts`

- [ ] **Step 1: Write a failing history test**

```ts
it("undoes and redoes node property changes", () => {
  const history = createProjectHistory(starterProject);
  history.execute(updateNode("choice-1", { title: "新的选择" }));
  expect(history.present().nodes.find(node => node.id === "choice-1")?.title).toBe("新的选择");
  history.undo();
  expect(history.present().nodes.find(node => node.id === "choice-1")?.title).not.toBe("新的选择");
  history.redo();
  expect(history.present().nodes.find(node => node.id === "choice-1")?.title).toBe("新的选择");
});
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter @flowfilm/editor-core test`

Expected: FAIL.

- [ ] **Step 3: Implement immutable commands**

Expose commands for adding, moving, updating, connecting and deleting nodes. Each command returns a new validated `Project`; history stores a bounded stack of 100 project snapshots and clears redo after a new command.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @flowfilm/editor-core test`

Expected: PASS.

- [ ] **Step 5: Commit commands**

```bash
git add packages/editor-core
git commit -m "feat: add editor command history"
```

### Task 6: Add Browser Persistence

**Files:**
- Create: `packages/storage-browser/src/repository.ts`
- Create: `packages/storage-browser/src/index.ts`
- Test: `packages/storage-browser/src/repository.test.ts`

- [ ] **Step 1: Write the repository contract test**

```ts
it("saves, lists and loads validated projects", async () => {
  const repository = createMemoryProjectRepository();
  await repository.save(starterProject);
  expect(await repository.list()).toEqual([{ id: starterProject.id, title: starterProject.title }]);
  expect(await repository.load(starterProject.id)).toEqual(starterProject);
});
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter @flowfilm/storage-browser test`

Expected: FAIL.

- [ ] **Step 3: Implement the adapter interface and Dexie adapter**

```ts
export interface ProjectRepository {
  list(): Promise<Array<{ id: string; title: string; updatedAt: number }>>;
  load(id: string): Promise<Project | null>;
  save(project: Project): Promise<void>;
  remove(id: string): Promise<void>;
  exportBackup(id: string): Promise<Blob>;
  importBackup(file: Blob): Promise<Project>;
}
```

Validate with `ProjectSchema` on every load and import. Keep a memory implementation for tests and Dexie for the editor.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @flowfilm/storage-browser test`

Expected: PASS.

- [ ] **Step 5: Commit persistence**

```bash
git add packages/storage-browser
git commit -m "feat: persist projects in indexeddb"
```

### Task 7: Build The Editor Workbench

**Files:**
- Create: `apps/editor/src/features/workbench/Workbench.tsx`
- Create: `apps/editor/src/features/graph/StoryGraph.tsx`
- Create: `apps/editor/src/features/inspector/NodeInspector.tsx`
- Create: `apps/editor/src/features/library/NodeLibrary.tsx`
- Create: `apps/editor/src/features/preview/PreviewDock.tsx`
- Create: `apps/editor/src/store/editorStore.ts`
- Create: `apps/editor/src/styles/tokens.css`
- Create: `apps/editor/src/styles/app.css`
- Test: `apps/editor/src/features/workbench/Workbench.test.tsx`

- [ ] **Step 1: Write a failing editor workflow test**

```tsx
it("adds a choice node and edits it without code", async () => {
  render(<Workbench initialProject={createStarterProject()} />);
  await userEvent.click(screen.getByRole("button", { name: "添加玩家选择" }));
  await userEvent.type(screen.getByLabelText("节点名称"), "是否进入仓库");
  expect(screen.getByText("是否进入仓库")).toBeVisible();
});
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter @flowfilm/editor test Workbench`

Expected: FAIL.

- [ ] **Step 3: Implement the app shell and node graph**

Use React Flow for pan, zoom, selection, connection and stable node dimensions. Implement the approved three-panel workbench with a bottom timeline placeholder that displays the selected scene duration. Use Lucide icons for commands, accessible labels, keyboard undo/redo, and no nested cards.

- [ ] **Step 4: Implement schema-driven inspectors**

Render text, number, select, asset reference and condition builder controls from node kind metadata. Every change dispatches an editor command; no component mutates the project directly.

- [ ] **Step 5: Run unit, type and build checks**

Run: `pnpm --filter @flowfilm/editor test && pnpm --filter @flowfilm/editor typecheck && pnpm --filter @flowfilm/editor build`

Expected: PASS.

- [ ] **Step 6: Commit the workbench**

```bash
git add apps/editor
git commit -m "feat: build visual story workbench"
```

### Task 8: Integrate The Real-Time Preview Player

**Files:**
- Create: `apps/player/src/Player.tsx`
- Create: `apps/player/src/player.css`
- Test: `apps/player/src/Player.test.tsx`
- Modify: `apps/editor/src/features/preview/PreviewDock.tsx`

- [ ] **Step 1: Write a failing player interaction test**

```tsx
it("renders choices and advances after selection", async () => {
  render(<Player project={choiceFixture} startNodeId="opening" />);
  await userEvent.click(screen.getByRole("button", { name: "前往旧仓库" }));
  expect(screen.getByText("旧仓库")).toBeVisible();
});
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter @flowfilm/player test`

Expected: FAIL.

- [ ] **Step 3: Implement the shared-runtime player**

Render scene media, speaker, dialogue, choices, ending state, loading state and recoverable media errors. Accept an optional runtime snapshot so preview can restart from the selected node.

- [ ] **Step 4: Mount the player in the preview dock**

Provide play, pause, restart, start-from-selected-node, viewport ratio and debug variable controls. Project changes replace the preview project while preserving the current node when its stable ID still exists.

- [ ] **Step 5: Run checks**

Run: `pnpm --filter @flowfilm/player test && pnpm --filter @flowfilm/editor test`

Expected: PASS.

- [ ] **Step 6: Commit preview runtime**

```bash
git add apps/player apps/editor/src/features/preview
git commit -m "feat: add realtime interactive preview"
```

### Task 9: Add Basic Visual UI Customization

**Files:**
- Create: `apps/editor/src/features/ui-editor/UiThemeEditor.tsx`
- Create: `apps/editor/src/features/ui-editor/DevicePreview.tsx`
- Test: `apps/editor/src/features/ui-editor/UiThemeEditor.test.tsx`
- Modify: `apps/player/src/Player.tsx`

- [ ] **Step 1: Write a failing binding test**

```tsx
it("updates player button styling from theme controls", async () => {
  render(<UiThemeEditor project={starterProject} />);
  await userEvent.click(screen.getByLabelText("强调色"));
  fireEvent.change(screen.getByLabelText("强调色"), { target: { value: "#e23d62" } });
  expect(screen.getByTestId("device-preview")).toHaveStyle("--player-accent: #e23d62");
});
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter @flowfilm/editor test UiThemeEditor`

Expected: FAIL.

- [ ] **Step 3: Implement the first UI editor slice**

Support font family, text scale, accent color, dialogue opacity, button radius, dialogue placement and choice placement. Device preview switches among desktop 16:9, mobile landscape and mobile portrait while showing safe areas and overflow warnings.

- [ ] **Step 4: Bind player CSS variables**

Map the validated `PlayerUiConfig` to CSS custom properties on the player root. Exported and editor-preview players must use the same mapping function.

- [ ] **Step 5: Run checks and commit**

Run: `pnpm --filter @flowfilm/editor test && pnpm --filter @flowfilm/player test`

Expected: PASS.

```bash
git add apps/editor/src/features/ui-editor apps/player
git commit -m "feat: add visual player theme editor"
```

### Task 10: Implement Static Web Export

**Files:**
- Create: `packages/export-web/src/exportProject.ts`
- Create: `packages/export-web/src/index.ts`
- Test: `packages/export-web/src/exportProject.test.ts`
- Create: `apps/player/src/export-entry.tsx`
- Modify: `apps/editor/src/features/workbench/Workbench.tsx`

- [ ] **Step 1: Write a failing export test**

```ts
it("creates a playable zip with project data and referenced assets", async () => {
  const result = await exportWebProject(starterProject, assetProvider);
  const zip = await JSZip.loadAsync(result);
  expect(Object.keys(zip.files)).toEqual(expect.arrayContaining(["index.html", "project.json", "assets/poster.webp"]));
});
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter @flowfilm/export-web test`

Expected: FAIL.

- [ ] **Step 3: Implement export preflight and package generation**

Call `diagnoseProject` and throw `ExportBlockedError` when any error exists. Include only referenced assets, serialized validated project data, built player assets, a relative-path `index.html`, and a `README.txt` with static-hosting instructions.

- [ ] **Step 4: Add the editor publish dialog**

Show blocking errors with focus actions, warnings with confirmation, progress states, cancellation before ZIP assembly, and a download action after success.

- [ ] **Step 5: Run export checks**

Run: `pnpm --filter @flowfilm/export-web test && pnpm build`

Expected: PASS and the player production bundle exists before ZIP assembly.

- [ ] **Step 6: Commit export**

```bash
git add packages/export-web apps/player apps/editor
git commit -m "feat: export playable web projects"
```

### Task 11: Verify The Complete Creator Workflow

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/creator-workflow.spec.ts`
- Create: `tests/e2e/mobile-preview.spec.ts`
- Create: `README.md`

- [ ] **Step 1: Write the end-to-end workflow**

```ts
test("creator builds, previews, reloads and exports a branch", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "新建真人互动影视" }).click();
  await page.getByRole("button", { name: "添加玩家选择" }).click();
  await page.getByLabel("节点名称").fill("是否进入仓库");
  await page.getByRole("button", { name: "从此处试玩" }).click();
  await expect(page.getByText("是否进入仓库")).toBeVisible();
  await page.reload();
  await expect(page.getByText("是否进入仓库")).toBeVisible();
  await page.getByRole("button", { name: "发布网页" }).click();
  await expect(page.getByText("作品包已生成")).toBeVisible();
});
```

- [ ] **Step 2: Run E2E and fix only observed failures**

Run: `pnpm e2e`

Expected: desktop creator workflow and three device preview checks PASS.

- [ ] **Step 3: Run the complete verification suite**

Run: `pnpm typecheck && pnpm test && pnpm build && pnpm e2e`

Expected: all commands exit with code 0.

- [ ] **Step 4: Perform visual browser QA**

Open the editor at desktop and mobile widths. Verify no overlapping controls, no clipped Chinese labels, stable node dimensions, visible preview media, usable keyboard focus, and that the exported player matches the configured theme.

- [ ] **Step 5: Document local operation and boundaries**

README must include prerequisites, `pnpm install`, `pnpm dev`, test commands, browser storage behavior, backup/export instructions, and the explicit exclusion of cloud collaboration and native packages from this MVP.

- [ ] **Step 6: Commit verified MVP**

```bash
git add README.md playwright.config.ts tests
git commit -m "test: verify complete creator workflow"
```

## Completion Gate

The MVP is complete only when a fresh browser can create a starter project, edit and connect nodes, configure a branch without code, preview both outcomes, reload the saved project, change the player theme, pass diagnostics, export a static ZIP, and play that ZIP through a local static server.
