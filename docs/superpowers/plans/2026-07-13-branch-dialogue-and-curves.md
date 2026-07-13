# Flexible Branches, Dialogue Modes, And Curved Edges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-scene dialogue visibility, flexible choice counts, and clearly curved graph connections without breaking existing projects.

**Architecture:** Extend the Zod project schema with migration-friendly defaults and keep choice IDs as the stable connection contract. Implement choice editing in the inspector, render scenes according to `showDialogue`, and switch React Flow edges to bezier curves. Keep editor preview and exported HTML behavior aligned.

**Tech Stack:** React 19, TypeScript, Zod, `@xyflow/react`, Vitest, Testing Library, Vite.

---

### Task 1: Extend The Project Schema

**Files:**
- Modify: `src/core/project.ts`
- Modify: `src/core/project.test.ts`

- [ ] Add failing tests proving old scene JSON defaults `showDialogue` to `true`, newly created scenes default it to `false`, and choice arrays allow one item.
- [ ] Run `src/core/project.test.ts` and confirm failure.
- [ ] Add `showDialogue: z.boolean().default(true)`, lower choice minimum to one, set the starter scene explicitly, and set new scenes to `false`.
- [ ] Rerun the project tests and confirm success.

### Task 2: Add Flexible Choice Editing

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/styles.css`

- [ ] Add failing editor tests for adding a third option, moving it, deleting it, retaining one minimum option, and removing the deleted option's edge.
- [ ] Add App-level callbacks that create unique option IDs, reorder choices without changing IDs, and delete choices plus matching edges.
- [ ] Replace fixed choice labels with an option editor row containing text input and icon buttons for up, down, and delete, followed by an add-option command.
- [ ] Run editor tests and confirm all choice workflows pass.

### Task 3: Add Scene Dialogue Modes

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/styles.css`

- [ ] Add failing tests for the scene dialogue switch and the compact continue control when a scene has no video and dialogue is disabled.
- [ ] Add the scene inspector checkbox and conditionally show speaker/dialogue fields only when enabled.
- [ ] Update `PreviewDock`: dialogue-enabled scenes render the existing dialogue box; dialogue-disabled videos call `onAdvance` on `ended`; dialogue-disabled non-video scenes show a compact continue button.
- [ ] Rerun editor tests and confirm preview behavior passes.

### Task 4: Curve Edges And Update Export

**Files:**
- Modify: `src/editor/StoryGraph.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [ ] Add an assertion that rendered graph edges use React Flow's bezier edge type.
- [ ] Change graph edge definitions from `smoothstep` to `bezier` and retain selected-edge styling.
- [ ] Update exported HTML so scene video does not loop, advances on `ended` when dialogue is disabled, and renders a compact fallback continue control for images or missing media.
- [ ] Add source-level export assertions for the dialogue and video-ended branches.

### Task 5: Verify And Deliver

**Files:**
- Modify: `outputs/flowfilm-engine.html`

- [ ] Run all Vitest tests, TypeScript no-emit checking, and the Vite production build; all must exit `0`.
- [ ] Run `node scripts\inline-build.mjs` and confirm the output file is updated.
- [ ] Commit source, tests, plan, and output using the separated Git directory with message `feat: add flexible branches and scene dialogue modes`.
