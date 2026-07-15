# FlowFilm Large Project Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add independent chapter canvases, safe variable management, cross-chapter diagnostic navigation, recovery-aware persistence, and measurable large-project performance without changing established canvas interactions.

**Architecture:** Upgrade the project schema to v3 with stable chapter ownership on every node and explicit chapter/anchor jump targets. Keep project transformations in pure command modules, editor-only active chapter and viewport state outside published project data, and persistence behind an asynchronous repository contract. Filter the full project into a chapter graph view while the runtime and diagnostics retain global indexes.

**Tech Stack:** TypeScript 5.8, React 19, Zod 3, XYFlow 12, Vitest 3, Testing Library, Playwright, Vite 7.

---

## File Map

- Modify `src/core/project.ts`: v3 chapter definitions, node ownership, and jump target schema.
- Modify `src/core/projectMigration.ts`: v2-to-v3 migration preserving anchor jump behavior.
- Modify `src/core/projectMigration.test.ts`: migration invariants and invalid chapter ownership.
- Modify `src/core/runtime.ts`: chapter-target and legacy anchor-target resolution.
- Modify `src/core/runtime.test.ts`: cross-chapter runtime coverage.
- Create `src/editor/chapterCommands.ts`: pure create, rename, reorder, duplicate, and delete transformations.
- Create `src/editor/chapterCommands.test.ts`: chapter command transactions and ID remapping.
- Create `src/editor/ChapterManager.tsx`: compact chapter list and actions.
- Create `src/editor/ChapterManager.test.tsx`: chapter switching and guarded deletion UI.
- Modify `src/editor/StoryGraph.tsx`: chapter-filtered graph and imperative node focus API.
- Modify `src/editor/StoryGraph.test.ts`: chapter graph filtering and focus contract.
- Create `src/editor/variableCommands.ts`: compatible type changes, reference replacement, and deletion.
- Create `src/editor/variableCommands.test.ts`: typed variable safety.
- Create `src/editor/VariableManager.tsx`: searchable, typed variable editor.
- Create `src/editor/VariableManager.test.tsx`: editing and replacement workflows.
- Modify `src/core/diagnostics.ts`: chapter ownership and cross-chapter edge diagnostics.
- Modify `src/core/diagnostics.test.ts`: locatable chapter issue coverage.
- Create `src/editor/projectRepository.ts`: async repository contract and browser adapter.
- Create `src/editor/projectRepository.test.ts`: current project and recovery-point retention behavior.
- Create `src/editor/useProjectPersistence.ts`: dirty/debounce/manual/recovery state machine.
- Create `src/editor/useProjectPersistence.test.tsx`: fake-timer persistence tests.
- Modify `src/App.tsx`: active chapter, project drawer tabs, diagnostic focus, and repository integration.
- Modify `src/App.test.tsx`: complete creator workflows and performance fixtures.
- Modify `src/test/largeProject.ts`: deterministic multi-chapter 300/1000/3000-node fixtures.
- Modify `src/v03.css`: chapter and variable list styling only.
- Modify `scripts/visual-qa.mjs`: chapter switching, diagnostic navigation, and recovery screenshots.
- Regenerate `outputs/flowfilm-engine.html`.

### Task 1: Project Schema v3 and Lossless Migration

**Files:**
- Modify: `src/core/project.ts`
- Modify: `src/core/projectMigration.ts`
- Modify: `src/core/projectMigration.test.ts`
- Modify: `src/core/project.test.ts`

- [ ] **Step 1: Write failing v2 migration tests**

Add a real v2 fixture containing a chapter anchor and jump:

```ts
it("migrates v2 nodes into the default chapter without changing graph identity", () => {
  const legacy = createV2Fixture();
  const migrated = loadProject(legacy);
  expect(migrated.schemaVersion).toBe(3);
  expect(migrated.chapters).toEqual([{ id: "main-story", name: "主剧情", order: 0, entryNodeId: "start" }]);
  expect(migrated.nodes.every(node => node.chapterId === "main-story")).toBe(true);
  expect(migrated.nodes.map(node => [node.id, node.position])).toEqual(legacy.nodes.map(node => [node.id, node.position]));
  expect(migrated.edges).toEqual(legacy.edges);
});

it("preserves v2 jump semantics as an anchor target", () => {
  const jump = loadProject(createV2Fixture()).nodes.find(node => node.id === "legacy-jump");
  expect(jump).toMatchObject({ kind: "jump", targetType: "anchor", targetId: "chapter-2" });
});
```

- [ ] **Step 2: Verify RED**

```powershell
& '.\node_modules\.bin\vitest.cmd' run src\core\projectMigration.test.ts src\core\project.test.ts --configLoader runner --pool=forks --maxWorkers=1
```

Expected: FAIL because schema version remains 2 and nodes have no chapter ownership.

- [ ] **Step 3: Implement the v3 schema**

Define `ChapterDefinitionSchema`, add `chapters` and `defaultChapterId`, extend every node through the base schema with `chapterId`, and replace jump payload with:

```ts
BaseNodeSchema.extend({
  kind: z.literal("jump"),
  targetType: z.enum(["chapter", "anchor"]),
  targetId: z.string().min(1),
});
```

Update `createStarterProject()` to create `main-story`. Update `createNode` to accept a chapter ID argument with `main-story` as the compatibility default.

- [ ] **Step 4: Implement v2-to-v3 migration**

Clone input, assign all nodes to `main-story`, convert old jump `{ chapterId }` into anchor target fields, create the default chapter, then validate with `ProjectSchema`. Keep v1 migration chained through v2 into v3.

- [ ] **Step 5: Verify and commit**

```powershell
& '.\node_modules\.bin\vitest.cmd' run src\core\projectMigration.test.ts src\core\project.test.ts --configLoader runner --pool=forks --maxWorkers=1
& '.\node_modules\.bin\tsc.cmd' -b --pretty false
git --git-dir=work/repo.git --work-tree=. add src/core/project.ts src/core/project.test.ts src/core/projectMigration.ts src/core/projectMigration.test.ts
git --git-dir=work/repo.git --work-tree=. commit -m "feat: define versioned chapter projects"
```

### Task 2: Chapter Runtime and Pure Chapter Commands

**Files:**
- Modify: `src/core/runtime.ts`
- Modify: `src/core/runtime.test.ts`
- Create: `src/editor/chapterCommands.ts`
- Create: `src/editor/chapterCommands.test.ts`

- [ ] **Step 1: Write failing runtime and command tests**

```ts
it("resolves a chapter jump through the target chapter entry", () => {
  const runtime = createRuntime(crossChapterFixture());
  expect(runtime.start()).toMatchObject({ currentNodeId: "chapter-two-ending", status: "ended" });
});

it("duplicates a chapter with remapped internal graph ids", () => {
  const result = duplicateChapter(chapterFixture(), "chapter-1", "seed");
  const copy = result.chapters.find(chapter => chapter.id === "chapter-seed");
  const copiedNodes = result.nodes.filter(node => node.chapterId === copy?.id);
  expect(copiedNodes).toHaveLength(3);
  expect(result.edges.filter(edge => copiedNodes.some(node => node.id === edge.source))).toHaveLength(2);
});

it("deletes a non-empty chapter but preserves broken jumps for diagnostics", () => {
  const result = deleteChapter(chapterFixture(), "chapter-2");
  expect(result.nodes.some(node => node.chapterId === "chapter-2")).toBe(false);
  expect(result.nodes).toContainEqual(expect.objectContaining({ kind: "jump", targetId: "chapter-2" }));
});
```

- [ ] **Step 2: Verify RED**

Run runtime and chapter command tests; expect missing APIs and old jump resolution failures.

- [ ] **Step 3: Implement runtime target resolution**

Build both chapter and anchor indexes. For `targetType === "chapter"`, resolve `ChapterDefinition.entryNodeId`; for `anchor`, resolve the existing chapter anchor node. Return explicit `missing-chapter-target` or `missing-anchor-target` errors.

- [ ] **Step 4: Implement immutable chapter commands**

Expose:

```ts
createChapter(project, name, seed): { project: Project; chapterId: string };
renameChapter(project, chapterId, name): Project;
reorderChapter(project, chapterId, direction): Project;
duplicateChapter(project, chapterId, seed): Project;
deleteChapter(project, chapterId): Project;
```

Reject deletion of the default chapter. Duplication remaps node IDs, edge IDs, choice IDs, random branch IDs, entry node ID, and internal targets in one transaction.

- [ ] **Step 5: Verify and commit**

Run focused tests and typecheck, then commit `feat: add chapter project commands`.

### Task 3: Independent Chapter Canvas and Chapter Manager

**Files:**
- Create: `src/editor/ChapterManager.tsx`
- Create: `src/editor/ChapterManager.test.tsx`
- Modify: `src/editor/StoryGraph.tsx`
- Modify: `src/editor/StoryGraph.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/v03.css`

- [ ] **Step 1: Write failing UI and graph tests**

```ts
it("filters the graph to one chapter and excludes cross-chapter edges", () => {
  const graph = selectChapterGraph(multiChapterProject(), "chapter-2");
  expect(graph.nodes.every(node => node.chapterId === "chapter-2")).toBe(true);
  expect(graph.edges.every(edge => graph.nodes.some(node => node.id === edge.source) && graph.nodes.some(node => node.id === edge.target))).toBe(true);
});
```

```tsx
it("switches chapters without adding a permanent sidebar", async () => {
  render(<App/>);
  await userEvent.click(screen.getByRole("button", { name: "项目" }));
  await userEvent.click(screen.getByRole("button", { name: "第二章" }));
  expect(screen.getByText(/雾港来信 \/ 第二章/)).toBeVisible();
  expect(screen.getByTestId("story-graph")).toHaveAttribute("data-chapter-id", "chapter-2");
});
```

- [ ] **Step 2: Verify RED**

Run StoryGraph, ChapterManager, and matching App tests.

- [ ] **Step 3: Implement graph selection and viewport state**

Create a pure `selectChapterGraph(project, chapterId)` helper. Pass only its nodes and internal edges to React Flow. Store viewports in an editor-only `Map<chapterId, Viewport>` and restore them on switch. New nodes receive `activeChapterId`.

- [ ] **Step 4: Implement the compact chapter manager**

Use row-based chapter items showing name, node count, and issue count. Put rename, duplicate, reorder, and delete in an action menu. Require explicit confirmation for non-empty deletion and explain affected node/jump counts.

- [ ] **Step 5: Integrate into the existing project drawer**

Add `章节` and `变量` tabs. Keep the drawer floating and resizable. Update the tool-island crumb from the active chapter definition. Do not alter wheel zoom, panning, marquee, selection, minimap, or grid props.

- [ ] **Step 6: Verify, browser-check, and commit**

Run component/App tests, typecheck, build, then use Playwright to switch chapters and confirm only the active chapter renders. Commit `feat: add independent chapter canvases`.

### Task 4: Safe Variable Commands and Variable Manager

**Files:**
- Create: `src/editor/variableCommands.ts`
- Create: `src/editor/variableCommands.test.ts`
- Create: `src/editor/VariableManager.tsx`
- Create: `src/editor/VariableManager.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/v03.css`

- [ ] **Step 1: Write failing command tests**

```ts
it("blocks incompatible variable type changes with locatable references", () => {
  const result = changeVariableType(variableFixture(), "score", "string");
  expect(result).toEqual({ ok: false, nodeIds: ["score-condition", "score-add"] });
});

it("replaces references before deleting a used variable", () => {
  const result = replaceAndDeleteVariable(variableFixture(), "score", "backup-score");
  expect(result.variables.some(variable => variable.id === "score")).toBe(false);
  expect(result.nodes.filter(node => node.kind === "condition" || node.kind === "setVariable").every(node => node.variableId !== "score")).toBe(true);
});
```

- [ ] **Step 2: Verify RED**

Run variable command tests; expect missing module failures.

- [ ] **Step 3: Implement indexed variable references and safe commands**

Expose `indexVariableReferences`, `updateVariable`, `changeVariableType`, `replaceAndDeleteVariable`, and `deleteUnusedVariable`. Convert initial values only when safe. Replacement variables must have the same type.

- [ ] **Step 4: Implement variable manager UI**

Add search, type filter, compact rows, inline name/default value editing, reference count, reference navigation, and guarded deletion. Use select/toggle/numeric controls according to variable type.

- [ ] **Step 5: Verify and commit**

Run variable tests plus existing node inspector and App regressions. Commit `feat: add safe variable management`.

### Task 5: Chapter-Aware Diagnostics and Focus Navigation

**Files:**
- Modify: `src/core/diagnostics.ts`
- Modify: `src/core/diagnostics.test.ts`
- Modify: `src/editor/StoryGraph.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Write failing diagnostics tests**

Cover missing chapter ownership, missing default chapter, cross-chapter normal edges, invalid chapter entry, and missing chapter jump targets. Every node issue must carry a node ID.

- [ ] **Step 2: Write a failing navigation test**

```tsx
it("opens the issue chapter and focuses its node", async () => {
  render(<App/>);
  await userEvent.click(screen.getByRole("button", { name: /项目检查/ }));
  await userEvent.click(screen.getByRole("button", { name: /第二章缺少连接/ }));
  expect(screen.getByTestId("story-graph")).toHaveAttribute("data-chapter-id", "chapter-2");
  expect(screen.getByRole("button", { name: "第二章节点" })).toHaveClass("selected");
});
```

- [ ] **Step 3: Implement chapter diagnostics**

Build chapter, node, edge, asset, and variable indexes once. Validate ownership and chapter entry before graph reachability.

- [ ] **Step 4: Add an imperative focus request**

Pass `focusNodeId` and a monotonically increasing request key to StoryGraph. After the active chapter renders, select the node and call XYFlow `setCenter` using its measured position and a clamped zoom.

- [ ] **Step 5: Verify and commit**

Run diagnostics, StoryGraph, and App tests, then commit `feat: navigate chapter diagnostics`.

### Task 6: Repository, Autosave, and Recovery Points

**Files:**
- Create: `src/editor/projectRepository.ts`
- Create: `src/editor/projectRepository.test.ts`
- Create: `src/editor/useProjectPersistence.ts`
- Create: `src/editor/useProjectPersistence.test.tsx`
- Modify: `src/editor/saveProject.ts`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Write failing repository tests**

Test save/load validation, manual/interval/migration recovery reasons, newest-first listing, maximum 10 points, and preservation of manual points when pruning.

- [ ] **Step 2: Write failing fake-timer persistence tests**

```tsx
it("debounces automatic saves for 800 ms", async () => {
  vi.useFakeTimers();
  const repository = createMemoryProjectRepository();
  const { result, rerender } = renderHook(({ project }) => useProjectPersistence(project, repository), { initialProps: { project: starter } });
  rerender({ project: renamed });
  await vi.advanceTimersByTimeAsync(799);
  expect(await repository.loadCurrent()).not.toEqual(renamed);
  await vi.advanceTimersByTimeAsync(1);
  expect(await repository.loadCurrent()).toEqual(renamed);
});
```

- [ ] **Step 3: Implement repository contract and browser adapter**

Use versioned keys for current project and recovery metadata. Validate every loaded project through `loadProject`. Keep a memory adapter for tests. The App no longer writes project JSON directly to `localStorage`.

- [ ] **Step 4: Implement persistence state machine**

Expose `dirty/saving/saved/error`, `manualSave`, recovery list, and restore. Debounce 800 ms, create interval points only when changed, and create a pre-restore point before restoring.

- [ ] **Step 5: Add recovery UI in project drawer**

Show timestamp, reason, node count, and chapter count. Restoring leaves the project dirty and visible before the next manual save.

- [ ] **Step 6: Verify and commit**

Run repository, hook, save, and App suites. Commit `feat: add project recovery persistence`.

### Task 7: Large-Project Benchmarks, Code Splitting, and Final QA

**Files:**
- Modify: `src/test/largeProject.ts`
- Modify: `src/App.test.tsx`
- Modify: `src/App.tsx`
- Modify: `scripts/visual-qa.mjs`
- Regenerate: `outputs/flowfilm-engine.html`

- [ ] **Step 1: Expand deterministic fixtures**

Create `createLargeProject(totalNodes, chapterCount)` with stable IDs, valid chapter entries, intra-chapter edges, and cross-chapter jump nodes.

- [ ] **Step 2: Add scale behavior tests**

Verify 300 and 1000-node active chapters retain controls. Verify a 3000-node/10-chapter project renders only the selected chapter's nodes and global diagnostics finish without losing issue locations. Record durations for information; assert structure and bounded rendered node counts rather than brittle milliseconds.

- [ ] **Step 3: Split non-first-screen code**

Use dynamic imports for the exported player generator and recovery modal/project management surfaces. Confirm the editor entry chunk falls below the current 500 KB warning threshold or document the remaining dependency owner with measured output.

- [ ] **Step 4: Run complete verification**

```powershell
& '.\node_modules\.bin\vitest.cmd' run --configLoader runner --pool=forks --maxWorkers=1
& '.\node_modules\.bin\tsc.cmd' -b --pretty false
& '.\node_modules\.bin\vite.cmd' build --configLoader runner
node scripts\inline-build.mjs
```

- [ ] **Step 5: Run visual QA**

Validate desktop dark/light plus compact light viewports. Exercise chapter switching, variable replacement, diagnostic focus, recovery list, wheel zoom, middle/right pan, marquee, grid, minimap, preview, and inspector resizing. Require zero relevant console errors and no framework overlay.

- [ ] **Step 6: Review and commit**

Confirm only intended source, QA script, and standalone HTML are staged; exclude `outputs/qa/`. Commit `test: verify large project management`.

## Completion Gate

This phase is complete only when v2 projects migrate without behavioral changes; creators can manage independent chapters and variables without code; diagnostic clicks switch and focus the correct chapter; autosave and recovery points survive reloads; a 3000-node multi-chapter project renders only its active chapter; established graph interactions remain intact; and all tests, type checks, builds, standalone generation, and visual QA pass.
