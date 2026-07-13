# FlowFilm v0.2 Editor Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the prototype interaction model with a stable, mature node-editor foundation that passes the complete v0.2 acceptance checklist.

**Architecture:** React Flow owns live node, edge, selection, and viewport interaction state. The project model receives committed graph changes at transaction boundaries such as drag stop, connect, delete, paste, and rename. A project history hook provides undo/redo, while editor-only layout state persists separately.

**Tech Stack:** React 19, TypeScript, `@xyflow/react`, Zod, Vitest, Testing Library, Vite, GitHub Actions Pages.

---

### Task 1: Live Graph State And Selection

- [ ] Add regression tests for live position changes, selection clearing, multi-selection, and selected color preservation.
- [ ] Refactor `StoryGraph` to `useNodesState`/`useEdgesState`, apply every React Flow change immediately, and persist positions only on drag stop.
- [ ] Add `onSelectionChange`, pane-click clearing, middle/space panning, left-drag marquee selection, select-all, focus-selected, and viewport persistence.
- [ ] Verify focused graph tests and TypeScript.

### Task 2: Project Transactions And History

- [ ] Create `src/editor/useProjectHistory.ts` with snapshot transactions, undo, redo, and bounded history.
- [ ] Route structural project edits through history-aware commits while keeping autosave separate.
- [ ] Add keyboard handling for delete, cut, copy, paste, duplicate, undo, redo, select all, focus, and Escape; ignore editing controls.
- [ ] Add ID-safe node cloning and tests for choices and connections.

### Task 3: Canvas Commands And Node Discovery

- [ ] Add a double-click searchable create menu positioned in flow coordinates.
- [ ] Add context menus for pane, nodes, and edges with only valid commands.
- [ ] Add rename and find-existing-node flows with focus/fit behavior.
- [ ] Remove the permanent node library and expose Assets/Project as toolbar drawers.

### Task 4: Preview And Panels

- [ ] Extract a floating preview shell with title-bar dragging, collapse, resize, reset, boundary clamping, and persisted geometry.
- [ ] Add asset search/type filtering/reference counts and project statistics/save state.
- [ ] Ensure drawers and preview isolate graph gestures and restore layout after reload.

### Task 5: Minimap, Connections, Organization, And Scale

- [ ] Fix minimap node measurement/color/viewport rendering and navigation.
- [ ] Add grid-snap toggle, edge reconnection validation, invalid-connection feedback, comment nodes, and reroute points where supported by the current schema.
- [ ] Add a 300-node performance fixture and ensure pointer movement does not commit the project.

### Task 6: End-To-End Verification And Delivery

- [ ] Run the complete unit/component suite, TypeScript, and production build.
- [ ] Run browser pointer tests for drag-follow, marquee, multi-drag, clear selection, preview geometry, and minimap visibility.
- [ ] Generate `outputs/flowfilm-engine.html`, commit all changes, push `main`, and confirm the Pages deployment workflow.
