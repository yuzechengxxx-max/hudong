import { memo, useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { Background, ConnectionMode, Controls, Handle, MiniMap, Position, ReactFlow, ReactFlowProvider, SelectionMode, useEdgesState, useNodesState, useReactFlow, type Connection, type Edge, type EdgeChange, type Node, type NodeChange, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { EyeOff, Grid3X3, Map as MapIcon } from "lucide-react";
import type { NodeKind, Project, StoryNode } from "../core/project";
import { getNodeDefinition } from "../core/nodeRegistry";

type GraphData = { story: StoryNode; asset?: Project["assets"][number] };

export function mergeSelection(initialIds: string[], hitIds: string[], additive: boolean) {
  return additive ? [...new Set([...initialIds, ...hitIds])] : hitIds;
}

export function preserveAdditiveSelection<T extends { type: string; id?: string; selected?: boolean }>(changes: T[], initialIds: string[], additive: boolean) {
  if (!additive) return changes;
  const initial = new Set(initialIds);
  return changes.filter(change => !(change.type === "select" && change.selected === false && change.id && initial.has(change.id)));
}

const StoryNodeView = memo(function StoryNodeView({ data, selected }: NodeProps<Node<GraphData>>) {
  const story = data.story;
  const definition = getNodeDefinition(story.kind);
  const mediaOffset = story.kind === "scene" && data.asset ? 58 : 0;
  const handles = story.kind === "choice" ? story.choices.map((choice, index) => ({ id: choice.id, label: choice.label, top: 68 + index * 25 })) : story.kind === "condition" ? [{ id: "true", label: "成立", top: 70 }, { id: "false", label: "不成立", top: 96 }] : story.kind === "ending" ? [] : [{ id: "next", label: "下一步", top: 72 + mediaOffset }];
  return <div className={`graph-node ${selected ? "selected" : ""} ${data.asset ? "has-media" : ""}`} data-kind={story.kind} style={{ "--node-color": definition.color, minHeight: Math.max(104 + mediaOffset, 70 + handles.length * 25) } as React.CSSProperties}>
    <Handle type="target" position={Position.Left} id="input" className="graph-handle input"/>
    <div className="graph-node-body" aria-label={story.title} role="button" tabIndex={0}><span>{definition.label}</span><strong>{story.title}</strong><small>{summary(story)}</small></div>
    {story.kind === "scene" && data.asset && <div className="graph-node-media">{data.asset.type.startsWith("image/") ? <img className="contain-media" src={data.asset.url} alt={data.asset.name}/> : data.asset.type.startsWith("video/") ? <video className="contain-media" src={data.asset.url} aria-label={data.asset.name} muted preload="metadata"/> : <span>{data.asset.name}</span>}</div>}
    {handles.map(handle => <div className="output-row" key={handle.id} style={{ top: handle.top }}><em>{handle.label}</em><Handle type="source" position={Position.Right} id={handle.id} className="graph-handle output"/></div>)}
  </div>;
});

const nodeTypes = { story: StoryNodeView };

type StoryGraphProps = {
  project: Project;
  selectedIds: string[];
  overlay?: ReactNode;
  onSelect(ids: string[]): void;
  onMove(id: string, x: number, y: number): void;
  onCreate(kind: Exclude<NodeKind, "start">, x: number, y: number): void;
  onConnect(source: string, port: string, target: string): void;
  onDeleteNodes(ids: string[]): void;
  onDeleteEdges(ids: string[]): void;
  onAssetDrop(assetId: string, targetNodeId: string | undefined, x: number, y: number): void;
  minimapVisible: boolean;
  onToggleMinimap(): void;
  gridVisible?: boolean;
  onToggleGrid?(): void;
};

export function StoryGraph(props: StoryGraphProps) {
  return <ReactFlowProvider><GraphInner {...props}/></ReactFlowProvider>;
}

function toNodes(project: Project, selectedIds: string[]): Node<GraphData>[] {
  const selected = new Set(selectedIds);
  return project.nodes.map(story => ({ id: story.id, type: "story", position: story.position, selected: selected.has(story.id), data: { story, asset: story.kind === "scene" ? project.assets.find(asset => asset.id === story.assetId) : undefined } }));
}

function toEdges(project: Project, selectedIds: string[]): Edge[] {
  const selected = new Set(selectedIds);
  return project.edges.map(edge => ({ id: edge.id, source: edge.source, target: edge.target, sourceHandle: edge.sourcePort, targetHandle: "input", type: "default", animated: selected.has(edge.source), style: { stroke: selected.has(edge.source) ? "#f0b429" : "#77818c", strokeWidth: 2 } }));
}

function GraphInner({ project, selectedIds, overlay, onSelect, onMove, onCreate, onConnect, onDeleteNodes, onDeleteEdges, onAssetDrop, minimapVisible, onToggleMinimap, gridVisible: externalGridVisible, onToggleGrid: externalToggleGrid }: StoryGraphProps) {
  const api = useReactFlow();
  const [localGridVisible, setLocalGridVisible] = useState(() => localStorage.getItem("flowfilm-grid-visible-v2") !== "false");
  const gridVisible = externalGridVisible ?? localGridVisible;
  const onToggleGrid = externalToggleGrid ?? (() => setLocalGridVisible(value => { localStorage.setItem("flowfilm-grid-visible-v2", String(!value)); return !value; }));
  const [nodes, setNodes, applyNodeChanges] = useNodesState<Node<GraphData>>(toNodes(project, selectedIds));
  const [edges, setEdges, applyEdgeChanges] = useEdgesState(toEdges(project, selectedIds));
  const [menu, setMenu] = useState<{ x: number; y: number; flowX: number; flowY: number }>();
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
  const [edgeMenu, setEdgeMenu] = useState<{ id: string; x: number; y: number }>();
  const graphRef = useRef<HTMLDivElement>(null);
  const paneGesture = useRef<{ x: number; y: number; moved: boolean; additive: boolean; initialIds: string[] } | undefined>(undefined);

  useEffect(() => {
    setNodes(current => toNodes(project, selectedIds).map(next => {
      const existing = current.find(node => node.id === next.id);
      return existing ? { ...next, position: existing.dragging ? existing.position : next.position, selected: next.selected } : next;
    }));
  }, [project.nodes, project.assets, selectedIds, setNodes]);

  useEffect(() => { setEdges(toEdges(project, selectedIds)); }, [project.edges, selectedIds, setEdges]);

  const onNodesChange = useCallback((changes: NodeChange<Node<GraphData>>[]) => {
    const visibleChanges = preserveAdditiveSelection(changes, paneGesture.current?.initialIds ?? [], paneGesture.current?.additive ?? false);
    applyNodeChanges(visibleChanges);
    const removed = changes.filter(change => change.type === "remove").map(change => change.id);
    if (removed.length) onDeleteNodes(removed);
    for (const change of changes) if (change.type === "position" && change.position && change.dragging === false) onMove(change.id, change.position.x, change.position.y);
  }, [applyNodeChanges, onDeleteNodes, onMove]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    applyEdgeChanges(changes);
    const removed = changes.filter(change => change.type === "remove").map(change => change.id);
    if (removed.length) onDeleteEdges(removed);
  }, [applyEdgeChanges, onDeleteEdges]);

  const handleConnect = useCallback((connection: Connection) => {
    if (connection.source && connection.target && connection.sourceHandle && connection.source !== connection.target) onConnect(connection.source, connection.sourceHandle, connection.target);
  }, [onConnect]);

  const isPaneEvent = (event: ReactMouseEvent<HTMLDivElement>) => (event.target as Element).classList.contains("react-flow__pane");

  const startPaneGesture = (target: EventTarget, x: number, y: number, additive: boolean) => {
    if ((target as Element).classList.contains("react-flow__pane")) paneGesture.current = { x, y, moved: false, additive, initialIds: selectedIds };
  };
  const movePaneGesture = (x: number, y: number) => {
    const gesture = paneGesture.current;
    if (gesture && Math.hypot(x - gesture.x, y - gesture.y) > 4) gesture.moved = true;
  };
  const finishSelection = useCallback((hitIds: string[]) => {
    const gesture = paneGesture.current;
    onSelect(mergeSelection(gesture?.initialIds ?? [], hitIds, gesture?.additive ?? false));
  }, [onSelect]);

  useEffect(() => {
    const graph = graphRef.current;
    const finishTestSelection = (event: Event) => {
      const detail = (event as CustomEvent<{ ids: string[]; initialIds?: string[]; additive?: boolean }>).detail;
      onSelect(mergeSelection(detail.initialIds ?? selectedIds, detail.ids, detail.additive ?? true));
    };
    graph?.addEventListener("flowfilm:selection-end", finishTestSelection);
    return () => graph?.removeEventListener("flowfilm:selection-end", finishTestSelection);
  }, [finishSelection, onSelect, selectedIds]);

  return <div ref={graphRef} className="story-graph" data-testid="story-graph" tabIndex={0} onMouseDownCapture={(event) => startPaneGesture(event.target, event.clientX, event.clientY, event.shiftKey)} onMouseMoveCapture={(event) => movePaneGesture(event.clientX, event.clientY)} onPointerDownCapture={(event) => {
    startPaneGesture(event.target, event.clientX, event.clientY, event.shiftKey);
  }} onPointerMoveCapture={(event) => {
    movePaneGesture(event.clientX, event.clientY);
  }} onDragOver={(event) => {
    if (event.dataTransfer.types.includes("application/x-flowfilm-asset")) event.preventDefault();
  }} onDrop={(event) => {
    const assetId = event.dataTransfer.getData("application/x-flowfilm-asset");
    if (!assetId) return;
    event.preventDefault();
    const element = event.target as Element;
    const nodeId = element.closest(".react-flow__node")?.getAttribute("data-id") ?? undefined;
    const target = project.nodes.find(node => node.id === nodeId && node.kind === "scene")?.id;
    const point = api.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    onAssetDrop(assetId, target, point.x, point.y);
  }} onKeyDownCapture={(event) => {
    if ((event.key === "Delete" || event.key === "Backspace") && selectedEdgeIds.length) {
      event.preventDefault();
      onDeleteEdges(selectedEdgeIds);
      setSelectedEdgeIds([]);
    }
  }} onClickCapture={(event) => {
    if (!isPaneEvent(event)) return;
    if (paneGesture.current?.moved) { paneGesture.current = undefined; return; }
    paneGesture.current = undefined;
    onSelect([]);
    setMenu(undefined);
    setEdgeMenu(undefined);
  }} onDoubleClickCapture={(event: ReactMouseEvent<HTMLDivElement>) => {
    if (!isPaneEvent(event)) return;
    const point = api.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const bounds = event.currentTarget.getBoundingClientRect();
    setMenu({ x: event.clientX - bounds.left, y: event.clientY - bounds.top, flowX: point.x, flowY: point.y });
  }}>
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={handleConnect}
      onEdgeClick={(_event, edge) => { setSelectedEdgeIds([edge.id]); setEdgeMenu(undefined); }}
      onEdgeContextMenu={(event, edge) => {
        event.preventDefault();
        const bounds = graphRef.current?.getBoundingClientRect();
        setSelectedEdgeIds([edge.id]);
        setEdgeMenu({ id: edge.id, x: event.clientX - (bounds?.left ?? 0), y: event.clientY - (bounds?.top ?? 0) });
      }}
      onNodeClick={(event, node) => {
        if (event.shiftKey) onSelect(selectedIds.includes(node.id) ? selectedIds.filter(id => id !== node.id) : [...selectedIds, node.id]);
        else onSelect([node.id]);
      }}
      onSelectionStart={(event) => {
        paneGesture.current = { x: event.clientX, y: event.clientY, moved: true, additive: event.shiftKey, initialIds: selectedIds };
      }}
      onSelectionEnd={() => finishSelection(api.getNodes().filter(node => node.selected).map(node => node.id))}
      fitView
      minZoom={0.12}
      maxZoom={2.5}
      snapToGrid
      snapGrid={[16,16]}
      panOnDrag={[1, 2]}
      zoomOnScroll
      zoomOnPinch
      panActivationKeyCode="Space"
      selectionOnDrag
      selectionMode={SelectionMode.Partial}
      connectionMode={ConnectionMode.Loose}
      deleteKeyCode={["Backspace","Delete"]}
      multiSelectionKeyCode="Shift"
      zoomOnDoubleClick={false}
      attributionPosition="bottom-left"
    >
      {gridVisible && <Background color="var(--ff-canvas-dot)" gap={22} size={1.4}/>} 
      {minimapVisible && <div className="graph-minimap-wrap" data-testid="graph-minimap"><MiniMap style={{ width: 140, height: 96 }} pannable zoomable nodeStrokeWidth={3} nodeColor={node => getNodeDefinition((node.data as GraphData).story.kind).color}/><button className="minimap-toggle" title="隐藏小地图" aria-label="隐藏小地图" onClick={onToggleMinimap}><EyeOff size={13}/></button></div>}
      <Controls showInteractive={false}/>
      {overlay}
      <div className="graph-toolbar"><button title="Fit view" aria-label="适应视图" onClick={() => api.fitView({ duration: 250, padding: 0.2 })}>适应画布</button><button className="grid-toggle" data-active={gridVisible || undefined} aria-pressed={gridVisible} title={gridVisible ? "隐藏点阵" : "显示点阵"} aria-label={gridVisible ? "隐藏点阵" : "显示点阵"} onClick={onToggleGrid}><Grid3X3 size={14}/></button></div>
      {!minimapVisible && <button className="minimap-toggle minimap-toggle-standalone" title="显示小地图" aria-label="显示小地图" onClick={onToggleMinimap}><MapIcon size={14}/></button>}
      {menu && <div className="node-create-menu nodrag nopan nowheel" style={{ left: menu.x, top: menu.y }}><b>创建节点</b>{(["scene","choice","condition","setVariable","ending"] as const).map(kind => { const definition = getNodeDefinition(kind); return <button key={kind} onClick={() => { onCreate(kind, menu.flowX, menu.flowY); setMenu(undefined); }}><i style={{ background: definition.color }}/>{definition.label}</button>; })}</div>}
      {edgeMenu && <div className="node-create-menu edge-context-menu nodrag nopan nowheel" style={{ left: edgeMenu.x, top: edgeMenu.y }}><b>连接操作</b><button onClick={() => { onDeleteEdges([edgeMenu.id]); setSelectedEdgeIds([]); setEdgeMenu(undefined); }}>断开连接</button></div>}
    </ReactFlow>
  </div>;
}

function summary(node: StoryNode) { if (node.kind === "scene") return node.showDialogue ? node.dialogue : "纯视频场景"; if (node.kind === "choice") return `${node.choices.length} 个分支`; if (node.kind === "condition") return `变量 ${node.operator} ${String(node.value)}`; if (node.kind === "setVariable") return `${node.operation === "add" ? "增加" : "设为"} ${String(node.value)}`; if (node.kind === "ending") return node.endingTitle; return "故事起点"; }
