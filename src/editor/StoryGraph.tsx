import { memo, useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { Background, ConnectionMode, Controls, Handle, MiniMap, Position, ReactFlow, ReactFlowProvider, SelectionMode, useEdgesState, useNodesState, useReactFlow, type Connection, type Edge, type EdgeChange, type Node, type NodeChange, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { NodeKind, Project, StoryNode } from "../core/project";

const colors: Record<StoryNode["kind"], string> = { start: "#83909c", scene: "#4b8fac", choice: "#d1a83d", condition: "#54a77b", setVariable: "#bd6d6d", ending: "#d46f48" };
const labels: Record<StoryNode["kind"], string> = { start: "故事入口", scene: "视频场景", choice: "玩家选择", condition: "条件判断", setVariable: "修改变量", ending: "故事结局" };
type GraphData = { story: StoryNode };

const StoryNodeView = memo(function StoryNodeView({ data, selected }: NodeProps<Node<GraphData>>) {
  const story = data.story;
  const handles = story.kind === "choice" ? story.choices.map((choice, index) => ({ id: choice.id, label: choice.label, top: 68 + index * 25 })) : story.kind === "condition" ? [{ id: "true", label: "成立", top: 70 }, { id: "false", label: "不成立", top: 96 }] : story.kind === "ending" ? [] : [{ id: "next", label: "下一步", top: 72 }];
  return <div className={`graph-node ${selected ? "selected" : ""}`} style={{ "--node-color": colors[story.kind], minHeight: Math.max(104, 70 + handles.length * 25) } as React.CSSProperties}>
    <Handle type="target" position={Position.Left} id="input" className="graph-handle input"/>
    <div className="graph-node-body" aria-label={story.title} role="button" tabIndex={0}><span>{labels[story.kind]}</span><strong>{story.title}</strong><small>{summary(story)}</small></div>
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
};

export function StoryGraph(props: StoryGraphProps) {
  return <ReactFlowProvider><GraphInner {...props}/></ReactFlowProvider>;
}

function toNodes(project: Project, selectedIds: string[]): Node<GraphData>[] {
  const selected = new Set(selectedIds);
  return project.nodes.map(story => ({ id: story.id, type: "story", position: story.position, selected: selected.has(story.id), data: { story } }));
}

function toEdges(project: Project, selectedIds: string[]): Edge[] {
  const selected = new Set(selectedIds);
  return project.edges.map(edge => ({ id: edge.id, source: edge.source, target: edge.target, sourceHandle: edge.sourcePort, targetHandle: "input", type: "default", animated: selected.has(edge.source), style: { stroke: selected.has(edge.source) ? "#f0b429" : "#77818c", strokeWidth: 2 } }));
}

function GraphInner({ project, selectedIds, overlay, onSelect, onMove, onCreate, onConnect, onDeleteNodes, onDeleteEdges }: StoryGraphProps) {
  const api = useReactFlow();
  const [nodes, setNodes, applyNodeChanges] = useNodesState<Node<GraphData>>(toNodes(project, selectedIds));
  const [edges, setEdges, applyEdgeChanges] = useEdgesState(toEdges(project, selectedIds));
  const [menu, setMenu] = useState<{ x: number; y: number; flowX: number; flowY: number }>();
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
  const [edgeMenu, setEdgeMenu] = useState<{ id: string; x: number; y: number }>();
  const graphRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNodes(current => toNodes(project, selectedIds).map(next => {
      const existing = current.find(node => node.id === next.id);
      return existing ? { ...next, position: existing.dragging ? existing.position : next.position, selected: next.selected } : next;
    }));
  }, [project.nodes, selectedIds, setNodes]);

  useEffect(() => { setEdges(toEdges(project, selectedIds)); }, [project.edges, selectedIds, setEdges]);

  const onNodesChange = useCallback((changes: NodeChange<Node<GraphData>>[]) => {
    applyNodeChanges(changes);
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

  return <div ref={graphRef} className="story-graph" data-testid="story-graph" tabIndex={0} onKeyDownCapture={(event) => {
    if ((event.key === "Delete" || event.key === "Backspace") && selectedEdgeIds.length) {
      event.preventDefault();
      onDeleteEdges(selectedEdgeIds);
      setSelectedEdgeIds([]);
    }
  }} onClickCapture={(event) => {
    if (!isPaneEvent(event)) return;
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
      onSelectionEnd={() => onSelect(api.getNodes().filter(node => node.selected).map(node => node.id))}
      fitView
      minZoom={0.12}
      maxZoom={2.5}
      snapToGrid
      snapGrid={[16,16]}
      panOnDrag={[1, 2]}
      panActivationKeyCode="Space"
      selectionOnDrag
      selectionMode={SelectionMode.Partial}
      connectionMode={ConnectionMode.Loose}
      deleteKeyCode={["Backspace","Delete"]}
      multiSelectionKeyCode="Shift"
      zoomOnDoubleClick={false}
      attributionPosition="bottom-left"
    >
      <Background gap={20} size={1}/>
      <MiniMap style={{ width: 140, height: 96 }} pannable zoomable nodeStrokeWidth={3} nodeColor={node => colors[(node.data as GraphData).story.kind]}/>
      <Controls showInteractive={false}/>
      {overlay}
      <div className="graph-toolbar"><button title="Fit view" aria-label="适应视图" onClick={() => api.fitView({ duration: 250, padding: 0.2 })}>适应画布</button></div>
      {menu && <div className="node-create-menu nodrag nopan nowheel" style={{ left: menu.x, top: menu.y }}><b>创建节点</b>{(["scene","choice","condition","setVariable","ending"] as const).map(kind => <button key={kind} onClick={() => { onCreate(kind, menu.flowX, menu.flowY); setMenu(undefined); }}><i style={{ background: colors[kind] }}/>{labels[kind]}</button>)}</div>}
      {edgeMenu && <div className="node-create-menu edge-context-menu nodrag nopan nowheel" style={{ left: edgeMenu.x, top: edgeMenu.y }}><b>连接操作</b><button onClick={() => { onDeleteEdges([edgeMenu.id]); setSelectedEdgeIds([]); setEdgeMenu(undefined); }}>断开连接</button></div>}
    </ReactFlow>
  </div>;
}

function summary(node: StoryNode) { if (node.kind === "scene") return node.showDialogue ? node.dialogue : "纯视频场景"; if (node.kind === "choice") return `${node.choices.length} 个分支`; if (node.kind === "condition") return `变量 ${node.operator} ${String(node.value)}`; if (node.kind === "setVariable") return `${node.operation === "add" ? "增加" : "设为"} ${String(node.value)}`; if (node.kind === "ending") return node.endingTitle; return "故事起点"; }
