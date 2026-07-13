# Graph Drag And Persistent Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore intuitive node dragging, reduce the minimap footprint, and keep the playable preview visible in the canvas upper-left corner.

**Architecture:** Keep React Flow as the graph interaction owner and remove the accidental drag exclusion from the full node body. Move `PreviewDock` into a canvas overlay supplied through `StoryGraph` children, while the right panel becomes inspector-only. Size visual overlays explicitly in CSS and React Flow props.

**Tech Stack:** React 19, TypeScript, `@xyflow/react`, Vitest, Testing Library, Vite.

---

### Task 1: Add Regression Tests

**Files:**
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Write failing assertions**

Add assertions that `.graph-node-body` does not contain `nodrag`, the preview is visible without opening a tab, no `预览` tab remains, and `.react-flow__minimap` has explicit `140` by `96` dimensions.

- [ ] **Step 2: Run the focused test**

Run: `cmd /c "node_modules\.bin\vitest.cmd run src\App.test.tsx --reporter=dot --configLoader runner --pool=forks --maxWorkers=1"`

Expected: FAIL because the node still has `nodrag`, preview is tab-gated, and minimap uses default dimensions.

### Task 2: Restore Dragging And Resize The Minimap

**Files:**
- Modify: `src/editor/StoryGraph.tsx`

- [ ] **Step 1: Make the node body draggable**

Change `className="graph-node-body nodrag"` to `className="graph-node-body"`. Keep React Flow's node wrapper responsible for pointer dragging and keep handles as connection controls.

- [ ] **Step 2: Set minimap dimensions**

Render `<MiniMap width={140} height={96} pannable zoomable ... />` and preserve node coloring.

- [ ] **Step 3: Allow a canvas overlay**

Add an optional `overlay?: React.ReactNode` prop to `StoryGraph` and render it inside the React Flow surface so it remains fixed while the viewport pans.

### Task 3: Make Preview Persistent

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Move preview into the graph**

Pass a `.canvas-preview` overlay to `StoryGraph` containing `PreviewDock` and the existing restart/expand controls. Remove `rightTab` state and the right-side `预览` tab; render the inspector form directly.

- [ ] **Step 2: Prevent graph gesture conflicts**

Add `nodrag nopan nowheel` classes to the preview overlay so buttons and scrolling do not move the canvas.

- [ ] **Step 3: Position overlays**

Set `.canvas-preview` to `position:absolute; top:12px; left:12px; width:280px; z-index:8`. Move `.graph-toolbar` below it and explicitly size `.react-flow__minimap` to `140px` by `96px`.

### Task 4: Verify And Deliver

**Files:**
- Modify: `outputs/flowfilm-engine.html`

- [ ] **Step 1: Run all checks**

Run the full Vitest suite, TypeScript no-emit check, and Vite production build. Expected: all commands exit `0`.

- [ ] **Step 2: Generate the single-file build**

Run: `node scripts\inline-build.mjs`

Expected: `outputs/flowfilm-engine.html` is updated and contains the current production assets inline.

- [ ] **Step 3: Commit**

Stage `src`, the plan, and `outputs/flowfilm-engine.html` with the separated Git directory and commit with message `fix: restore graph dragging and persistent preview`.
