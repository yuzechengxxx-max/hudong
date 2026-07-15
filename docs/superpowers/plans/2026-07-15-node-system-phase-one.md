# FlowFilm Node System Phase One Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a schema-driven node system that can build, preview, validate, migrate, and export a conventional live-action interactive film with chapters, jumps, random paths, waits, audio, timed choices, and typed variables.

**Architecture:** A framework-independent node registry owns editor metadata and output-port rules. Versioned project loading migrates v1 JSON into the v2 discriminated union. The indexed runtime executes automatic nodes deterministically and emits player effects, while React components consume the shared registry and runtime APIs without changing established canvas interactions.

**Tech Stack:** TypeScript 5.8, React 19, Zod 3, XYFlow 12, Vitest 3, Testing Library, Playwright, Vite 7.

---

## File Map

- Create `src/core/nodeRegistry.ts`: node labels, categories, colors, search terms, default construction, and dynamic output ports.
- Create `src/core/nodeRegistry.test.ts`: registry completeness, search metadata, and dynamic port behavior.
- Create `src/core/projectMigration.ts`: version detection and v1-to-v2 migration.
- Create `src/core/projectMigration.test.ts`: lossless v1 migration and invalid-version behavior.
- Modify `src/core/project.ts`: v2 Zod schemas, node and variable operation types, and constructors.
- Modify `src/core/project.test.ts`: v2 schema and typed operation validation.
- Modify `src/core/runtime.ts`: indexed edges, new automatic/waiting nodes, effects, timeout and resume events.
- Modify `src/core/runtime.test.ts`: deterministic tests for every new runtime behavior.
- Modify `src/core/diagnostics.ts`: registry-driven output checks and typed reference validation.
- Modify `src/core/diagnostics.test.ts`: locatable diagnostic coverage.
- Create `src/editor/NodeCreateMenu.tsx`: categorized, searchable, keyboard-operable node menu.
- Create `src/editor/NodeCreateMenu.test.tsx`: filtering and keyboard creation tests.
- Modify `src/editor/StoryGraph.tsx`: registry-driven nodes, ports, summaries, and new menu integration.
- Modify `src/editor/StoryGraph.test.ts`: port derivation and graph conversion tests.
- Create `src/editor/NodeInspector.tsx`: focused editors for new node payloads and typed variable controls.
- Create `src/editor/NodeInspector.test.tsx`: creator-facing property editing tests.
- Modify `src/App.tsx`: migrated loading/import, runtime events, diagnostics navigation, inspector and player integration.
- Modify `src/App.test.tsx`: end-to-end editor preview behaviors.
- Create `src/core/exportPlayer.ts`: exported-player document generation separated from `App.tsx`.
- Create `src/core/exportPlayer.test.ts`: exported runtime feature assertions.
- Modify `src/v03.css`: only the new menu, inspector fields, timer and audio-status presentation.
- Modify `scripts/visual-qa.mjs`: add screenshots for the categorized menu and new node inspector.

### Task 1: Version 2 Project Schema, Migration, and Node Registry

**Files:**
- Create: `src/core/nodeRegistry.ts`
- Create: `src/core/nodeRegistry.test.ts`
- Create: `src/core/projectMigration.ts`
- Create: `src/core/projectMigration.test.ts`
- Modify: `src/core/project.ts`
- Modify: `src/core/project.test.ts`

- [ ] **Step 1: Write failing registry and migration tests**

Add tests that express the complete public contract:

```ts
it("registers every persisted node kind exactly once", () => {
  expect(nodeDefinitions.map(item => item.kind)).toEqual([
    "start", "scene", "choice", "timedChoice", "condition",
    "setVariable", "random", "wait", "music", "sound",
    "chapter", "jump", "ending",
  ]);
  expect(new Set(nodeDefinitions.map(item => item.kind)).size).toBe(nodeDefinitions.length);
});

it("derives dynamic ports from choice and random branch data", () => {
  expect(getNodeOutputs(createNode("timedChoice", 1)).map(port => port.id))
    .toEqual(["option-a", "option-b", "timeout"]);
  expect(getNodeOutputs(createNode("random", 2)).map(port => port.id))
    .toEqual(["branch-a", "branch-b"]);
});

it("migrates v1 without changing stable ids or graph positions", () => {
  const legacy = createLegacyV1Fixture();
  const migrated = loadProject(legacy);
  expect(migrated.schemaVersion).toBe(2);
  expect(migrated.nodes.map(node => [node.id, node.position]))
    .toEqual(legacy.nodes.map(node => [node.id, node.position]));
  expect(migrated.edges).toEqual(legacy.edges);
});
```

- [ ] **Step 2: Run the focused tests and confirm RED**

Run:

```powershell
& '.\node_modules\.bin\vitest.cmd' run src\core\nodeRegistry.test.ts src\core\projectMigration.test.ts --configLoader runner
```

Expected: FAIL because the registry and migration modules do not exist.

- [ ] **Step 3: Define the v2 discriminated union**

In `src/core/project.ts`, retain stable base fields and add concrete Zod schemas. Use these persisted shapes:

```ts
type NodeKind =
  | "start" | "scene" | "choice" | "timedChoice" | "condition"
  | "setVariable" | "random" | "wait" | "music" | "sound"
  | "chapter" | "jump" | "ending";

type VariableOperation =
  | "set" | "add" | "subtract" | "multiply" | "divide"
  | "append" | "toggle";

type ComparisonOperator =
  | "eq" | "neq" | "gt" | "gte" | "lt" | "lte"
  | "contains" | "notContains";
```

Set `ProjectSchema` to `schemaVersion: z.literal(2)`. Timed choices have `durationMs`, normal choice data, and an implicit `timeout` output. Random branches contain `{ id, label, weight }`. Audio nodes reference `assetId`; wait nodes use `durationMs`; jumps use `chapterId`; chapter nodes use a stable `chapterId` distinct from the node ID.

- [ ] **Step 4: Implement explicit project migration**

In `src/core/projectMigration.ts`, expose one safe loading entry point:

```ts
export function loadProject(input: unknown): Project {
  const version = readSchemaVersion(input);
  if (version === 1) return ProjectSchema.parse(migrateV1ToV2(input));
  if (version === 2) return ProjectSchema.parse(input);
  throw new Error(`不支持的项目格式版本：${String(version)}`);
}
```

Map v1 `setVariable.operation` values without changing node IDs or edges. Map legacy condition operators directly. Do not mutate `input`.

- [ ] **Step 5: Implement the framework-independent registry**

Define:

```ts
export interface NodeDefinition<K extends NodeKind = NodeKind> {
  kind: K;
  label: string;
  description: string;
  category: "content" | "interaction" | "logic" | "performance" | "structure" | "ending";
  color: string;
  runtimeMode: "visible" | "automatic" | "waiting";
  searchTerms: readonly string[];
}

export function getNodeDefinition(kind: NodeKind): NodeDefinition;
export function getNodeOutputs(node: StoryNode): Array<{ id: string; label: string }>;
```

Move labels and colors out of `App.tsx` and `StoryGraph.tsx` only after tests pass. Keep React imports out of this module.

- [ ] **Step 6: Run schema, registry, and migration tests**

Run:

```powershell
& '.\node_modules\.bin\vitest.cmd' run src\core\project.test.ts src\core\nodeRegistry.test.ts src\core\projectMigration.test.ts --configLoader runner
```

Expected: PASS with all v1 and v2 fixtures validated.

- [ ] **Step 7: Commit the data foundation**

```powershell
git --git-dir=work/repo.git --work-tree=. add src/core/project.ts src/core/project.test.ts src/core/nodeRegistry.ts src/core/nodeRegistry.test.ts src/core/projectMigration.ts src/core/projectMigration.test.ts
git --git-dir=work/repo.git --work-tree=. commit -m "feat: define versioned node registry"
```

### Task 2: Indexed Runtime and New Node Semantics

**Files:**
- Modify: `src/core/runtime.ts`
- Modify: `src/core/runtime.test.ts`

- [ ] **Step 1: Write one failing test per runtime behavior**

Cover deterministic random selection, chapter jump, typed operations, waiting, timed-choice timeout, and audio effects. Representative tests:

```ts
it("selects a weighted random output using the injected source", () => {
  const runtime = createRuntime(randomFixture(), { random: () => 0.75 });
  expect(runtime.start()).toMatchObject({ currentNodeId: "ending-b", status: "ended" });
});

it("waits until resume is explicitly requested", () => {
  const runtime = createRuntime(waitFixture());
  expect(runtime.start()).toMatchObject({ status: "waiting", currentNodeId: "pause" });
  expect(runtime.resume()).toMatchObject({ status: "playing", currentNodeId: "scene-after" });
});

it("takes the timeout port of a timed choice", () => {
  const runtime = createRuntime(timedChoiceFixture());
  expect(runtime.start().status).toBe("awaiting-choice");
  expect(runtime.timeout()).toMatchObject({ currentNodeId: "timeout-ending", status: "ended" });
});

it("emits an audio effect without executing browser APIs", () => {
  const state = createRuntime(musicFixture()).start();
  expect(state.effects).toContainEqual({ type: "music-play", assetId: "music-1", volume: 0.8 });
});
```

- [ ] **Step 2: Verify the new tests fail for missing behavior**

Run:

```powershell
& '.\node_modules\.bin\vitest.cmd' run src\core\runtime.test.ts --configLoader runner
```

Expected: FAIL on missing runtime options, states, events, and node cases.

- [ ] **Step 3: Build node, edge, and chapter indexes once**

Replace repeated `project.edges.find` calls with maps keyed by `source` and `sourcePort`. Build a chapter map keyed by `chapterId`. Reject duplicate chapter IDs through diagnostics, while runtime returns an explicit error when a referenced target cannot be resolved.

- [ ] **Step 4: Extend the snapshot and runtime API**

Use:

```ts
interface RuntimeSnapshot {
  currentNodeId: string | null;
  variables: Record<string, string | number | boolean>;
  visitedNodeIds: string[];
  status: "idle" | "playing" | "awaiting-choice" | "waiting" | "ended" | "error";
  pendingInteraction?: { type: "wait" | "timed-choice"; durationMs: number };
  effects: RuntimeEffect[];
  error?: { code: string; message: string; nodeId?: string };
}
```

Expose `resume()`, `timeout()`, and `consumeEffects()`. Preserve `start`, `advance`, `choose`, `restore`, and `snapshot`.

- [ ] **Step 5: Implement automatic node execution minimally**

Execute chapter, jump, condition, set-variable, random, music, and sound nodes inside the guarded traversal loop. Wait yields `waiting`; choices yield `awaiting-choice`; scenes yield `playing`; endings yield `ended`. Division by zero returns an error snapshot rather than `Infinity`.

- [ ] **Step 6: Run runtime and existing project tests**

```powershell
& '.\node_modules\.bin\vitest.cmd' run src\core\runtime.test.ts src\core\project.test.ts --configLoader runner
```

Expected: PASS with no timers, DOM APIs, or nondeterministic assertions.

- [ ] **Step 7: Commit runtime behavior**

```powershell
git --git-dir=work/repo.git --work-tree=. add src/core/runtime.ts src/core/runtime.test.ts
git --git-dir=work/repo.git --work-tree=. commit -m "feat: execute interactive film node system"
```

### Task 3: Registry-Driven Diagnostics

**Files:**
- Modify: `src/core/diagnostics.ts`
- Modify: `src/core/diagnostics.test.ts`

- [ ] **Step 1: Write failing diagnostic tests**

Use table-driven fixtures for missing required ports, missing jump targets, duplicate chapters, unknown variables, invalid typed operations, missing or wrong-type audio assets, invalid weights, and invalid durations:

```ts
it.each([
  [brokenJumpProject(), "missing-jump-target"],
  [duplicateChapterProject(), "duplicate-chapter"],
  [missingVariableProject(), "missing-variable"],
  [wrongAudioAssetProject(), "invalid-asset-type"],
  [zeroWeightProject(), "invalid-random-weight"],
])("reports a locatable issue", (project, code) => {
  expect(diagnoseProject(project)).toContainEqual(
    expect.objectContaining({ code, nodeId: expect.any(String) }),
  );
});
```

- [ ] **Step 2: Run diagnostics tests and confirm RED**

```powershell
& '.\node_modules\.bin\vitest.cmd' run src\core\diagnostics.test.ts --configLoader runner
```

Expected: FAIL because the new issue codes are not emitted.

- [ ] **Step 3: Implement indexed graph and reference validation**

Build `nodeIds`, `variablesById`, `assetsById`, `outgoingByNode`, and `chaptersById` once. Use `getNodeOutputs(node)` as the required-port source. Treat unconnected choice options as errors because they strand a player-visible command; retain unreachable nodes as warnings.

- [ ] **Step 4: Verify diagnostics and runtime together**

```powershell
& '.\node_modules\.bin\vitest.cmd' run src\core\diagnostics.test.ts src\core\runtime.test.ts --configLoader runner
```

Expected: PASS and every runtime-invalid reference has a preflight diagnostic.

- [ ] **Step 5: Commit diagnostics**

```powershell
git --git-dir=work/repo.git --work-tree=. add src/core/diagnostics.ts src/core/diagnostics.test.ts
git --git-dir=work/repo.git --work-tree=. commit -m "feat: diagnose node system errors"
```

### Task 4: Searchable Node Creation and Graph Rendering

**Files:**
- Create: `src/editor/NodeCreateMenu.tsx`
- Create: `src/editor/NodeCreateMenu.test.tsx`
- Modify: `src/editor/StoryGraph.tsx`
- Modify: `src/editor/StoryGraph.test.ts`
- Modify: `src/v03.css`

- [ ] **Step 1: Write failing menu interaction tests**

```tsx
it("filters by Chinese label and creates at the requested graph position", async () => {
  const onCreate = vi.fn();
  render(<NodeCreateMenu position={{ x: 80, y: 90 }} graphPosition={{ x: 420, y: 260 }} onCreate={onCreate} onClose={() => {}} />);
  await userEvent.type(screen.getByRole("searchbox"), "随机");
  await userEvent.click(screen.getByRole("button", { name: /随机分支/ }));
  expect(onCreate).toHaveBeenCalledWith("random", 420, 260);
});

it("supports arrow navigation, Enter creation, and Escape close", async () => {
  const onCreate = vi.fn();
  const onClose = vi.fn();
  const view = render(<NodeCreateMenu position={{ x: 20, y: 30 }} graphPosition={{ x: 100, y: 120 }} onCreate={onCreate} onClose={onClose} />);
  await userEvent.keyboard("{ArrowDown}{Enter}");
  expect(onCreate).toHaveBeenCalledTimes(1);
  view.unmount();
  render(<NodeCreateMenu position={{ x: 20, y: 30 }} graphPosition={{ x: 100, y: 120 }} onCreate={onCreate} onClose={onClose} />);
  await userEvent.keyboard("{Escape}");
  expect(onClose).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Verify menu tests fail**

```powershell
& '.\node_modules\.bin\vitest.cmd' run src\editor\NodeCreateMenu.test.tsx --configLoader runner
```

Expected: FAIL because `NodeCreateMenu` does not exist.

- [ ] **Step 3: Implement categorized search without canvas side effects**

Render the registry definitions except `start`, grouped by category. Autofocus the searchbox. Stop pointer and wheel propagation inside the menu. Do not call fit-view or mutate viewport state when opening or creating.

- [ ] **Step 4: Replace graph-local labels, colors, and port switches**

In `StoryGraph.tsx`, use `getNodeDefinition(story.kind)` and `getNodeOutputs(story)` for headers, minimap color, handles, and labels. Keep the established wheel zoom, middle/right pan, left marquee, Shift-additive selection, curved connections, grid, minimap, and context-menu disconnection props unchanged.

- [ ] **Step 5: Add graph conversion tests for every dynamic port type**

Assert that timed-choice timeout and random branch handles exist, endings have none, and existing choices preserve custom port IDs after duplication.

- [ ] **Step 6: Run graph and menu tests**

```powershell
& '.\node_modules\.bin\vitest.cmd' run src\editor\NodeCreateMenu.test.tsx src\editor\StoryGraph.test.ts src\editor\projectCommands.test.ts --configLoader runner
```

Expected: PASS without regressions in selection, duplication, or connection behavior.

- [ ] **Step 7: Commit node creation UX**

```powershell
git --git-dir=work/repo.git --work-tree=. add src/editor/NodeCreateMenu.tsx src/editor/NodeCreateMenu.test.tsx src/editor/StoryGraph.tsx src/editor/StoryGraph.test.ts src/v03.css
git --git-dir=work/repo.git --work-tree=. commit -m "feat: add searchable node creation menu"
```

### Task 5: Creator-Facing Node Inspector

**Files:**
- Create: `src/editor/NodeInspector.tsx`
- Create: `src/editor/NodeInspector.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/v03.css`

- [ ] **Step 1: Write failing property-editing tests**

Test adding/removing random branches, configuring timed-choice duration, selecting chapter targets, selecting audio assets with name/type feedback, and restricting variable operations by type:

```tsx
it("only offers number operations for a number variable", () => {
  render(<NodeInspector project={numberVariableProject()} selectedId="set-score" onChange={vi.fn()} />);
  expect(screen.getByRole("option", { name: "增加" })).toBeInTheDocument();
  expect(screen.queryByRole("option", { name: "追加文本" })).not.toBeInTheDocument();
});

it("removing a random branch removes its connected edge atomically", async () => {
  const onChange = vi.fn();
  render(<NodeInspector project={randomProject()} selectedId="random-1" onChange={onChange} />);
  await userEvent.click(screen.getByRole("button", { name: "删除分支 B" }));
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
    edges: expect.not.arrayContaining([expect.objectContaining({ sourcePort: "branch-b" })]),
  }));
});
```

- [ ] **Step 2: Run inspector tests and confirm RED**

```powershell
& '.\node_modules\.bin\vitest.cmd' run src\editor\NodeInspector.test.tsx --configLoader runner
```

Expected: FAIL because the new inspector is absent.

- [ ] **Step 3: Implement focused editors with immutable project updates**

Keep each node-kind editor small and type-narrowed. Use milliseconds internally and display seconds in numeric controls. Show only audio MIME assets for music and sound. For jumps, list chapter names and stable chapter IDs. Apply branch deletion and connected-edge cleanup in one project update.

- [ ] **Step 4: Replace the inline inspector in `App.tsx`**

Pass the whole project and selected node ID to `NodeInspector`. Keep the existing floating inspector position and bottom-left resize behavior intact. After marquee selecting exactly one node, the same selected ID must populate the inspector.

- [ ] **Step 5: Load and import projects through migration**

Replace direct `ProjectSchema.parse(JSON.parse(...))` calls in `App.tsx` with `loadProject`. On failure, retain the current project and show a clear import error. Saving continues to serialize the current v2 project.

- [ ] **Step 6: Run inspector and app tests**

```powershell
& '.\node_modules\.bin\vitest.cmd' run src\editor\NodeInspector.test.tsx src\App.test.tsx --configLoader runner --pool=forks --maxWorkers=1
```

Expected: PASS with save feedback, selection, preview, and existing property edits preserved.

- [ ] **Step 7: Commit inspector integration**

```powershell
git --git-dir=work/repo.git --work-tree=. add src/editor/NodeInspector.tsx src/editor/NodeInspector.test.tsx src/App.tsx src/App.test.tsx src/v03.css
git --git-dir=work/repo.git --work-tree=. commit -m "feat: edit interactive film node properties"
```

### Task 6: Preview and Export Parity

**Files:**
- Create: `src/core/exportPlayer.ts`
- Create: `src/core/exportPlayer.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/v03.css`

- [ ] **Step 1: Write failing preview and export tests**

Cover wait skip, timed-choice timeout, audio effect consumption, restart reset, and generated-player support:

```tsx
it("shows and skips a wait interaction", async () => {
  render(<App initialProject={waitProject()} />);
  expect(await screen.findByText("等待 2 秒")).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "跳过等待" }));
  expect(screen.getByText("等待后的场景")).toBeVisible();
});

it("exports handlers for all v2 node kinds", () => {
  const html = createExportPlayerHtml(completeV2Project());
  expect(html).toContain("timedChoice");
  expect(html).toContain("music-play");
  expect(html).toContain("schemaVersion");
});
```

- [ ] **Step 2: Verify RED**

```powershell
& '.\node_modules\.bin\vitest.cmd' run src\core\exportPlayer.test.ts src\App.test.tsx --configLoader runner --pool=forks --maxWorkers=1
```

Expected: FAIL because preview controls and the extracted exporter do not support v2 nodes.

- [ ] **Step 3: Integrate runtime events into preview**

Render waiting state with remaining duration and skip control. Render timed choices with a visible countdown and call `runtime.timeout()` once. Consume audio effects exactly once and manage one background-music element plus overlapping sound-effect elements. Display a recoverable message when browser autoplay blocks sound.

- [ ] **Step 4: Extract and upgrade export generation**

Move the inline HTML generator from `App.tsx` to `src/core/exportPlayer.ts`. Generated HTML must validate the embedded version, index graph data, implement the same operations and node cases, and escape serialized project data so `</script>` inside creator text cannot terminate the script block.

- [ ] **Step 5: Verify preview/export parity**

```powershell
& '.\node_modules\.bin\vitest.cmd' run src\core\runtime.test.ts src\core\exportPlayer.test.ts src\App.test.tsx --configLoader runner --pool=forks --maxWorkers=1
```

Expected: PASS; each v2 node kind is covered by a runtime or player assertion.

- [ ] **Step 6: Commit player parity**

```powershell
git --git-dir=work/repo.git --work-tree=. add src/core/exportPlayer.ts src/core/exportPlayer.test.ts src/App.tsx src/App.test.tsx src/v03.css
git --git-dir=work/repo.git --work-tree=. commit -m "feat: preview and export v2 node projects"
```

### Task 7: Full Regression, Visual QA, and Standalone Build

**Files:**
- Modify: `scripts/visual-qa.mjs`
- Regenerate: `outputs/flowfilm-engine.html`

- [ ] **Step 1: Run all focused unit groups**

```powershell
& '.\node_modules\.bin\vitest.cmd' run src\core --configLoader runner --pool=forks --maxWorkers=1
& '.\node_modules\.bin\vitest.cmd' run src\editor --configLoader runner --pool=forks --maxWorkers=1
& '.\node_modules\.bin\vitest.cmd' run src\App.test.tsx --configLoader runner --pool=forks --maxWorkers=1
```

Expected: all tests PASS with zero unhandled errors.

- [ ] **Step 2: Run static and production build checks**

```powershell
& '.\node_modules\.bin\tsc.cmd' -b --pretty false
& '.\node_modules\.bin\vite.cmd' build --configLoader runner
node scripts\inline-build.mjs
```

Expected: all commands exit 0 and `outputs/flowfilm-engine.html` is regenerated as valid UTF-8 HTML.

- [ ] **Step 3: Extend automated browser QA**

Update `scripts/visual-qa.mjs` to open the node menu, search for “随机”, create the node, select it, and capture dark and light screenshots. Also verify with Playwright assertions that normal wheel changes viewport zoom, the grid transforms with the viewport, and inspector resizing remains proportional to pointer movement.

- [ ] **Step 4: Run visual QA and inspect screenshots**

Serve `dist` locally, run:

```powershell
& 'C:\Users\yu\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m http.server 4180 --bind 127.0.0.1 --directory dist
node scripts\visual-qa.mjs
```

Inspect `outputs/qa/` at desktop and compact widths. Confirm no overlaps, clipped Chinese text, unreadable light controls, hidden grid, displaced resize handles, or changes to established canvas interactions. Do not add `outputs/qa/` to Git.

- [ ] **Step 5: Review the final diff against the design specification**

Check every node kind is present in schema, registry, runtime, diagnostics, inspector, preview, and export. Confirm no generated dependency or QA screenshot entered the diff:

```powershell
git --git-dir=work/repo.git --work-tree=. status --short
git --git-dir=work/repo.git --work-tree=. diff --check
```

- [ ] **Step 6: Commit verification artifacts**

```powershell
git --git-dir=work/repo.git --work-tree=. add scripts/visual-qa.mjs outputs/flowfilm-engine.html
git --git-dir=work/repo.git --work-tree=. commit -m "test: verify node system phase one"
```

## Completion Gate

The phase is complete only when a migrated v1 project and a newly created v2 project both load; every listed node can be created and edited without code; runtime, preview, and exported HTML agree on behavior; diagnostics locate invalid references; existing canvas interactions remain unchanged; all focused tests, type checks, production build, standalone build, and visual QA pass.
