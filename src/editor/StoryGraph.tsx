import { memo, useCallback, useMemo, type ReactNode } from "react";
import { Background, ConnectionMode, Controls, Handle, MiniMap, Position, ReactFlow, ReactFlowProvider, useReactFlow, type Connection, type Edge, type EdgeChange, type Node, type NodeChange, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Project, StoryNode } from "../core/project";

const colors: Record<StoryNode["kind"], string> = { start: "#83909c", scene: "#4b8fac", choice: "#d1a83d", condition: "#54a77b", setVariable: "#bd6d6d", ending: "#d46f48" };
const labels: Record<StoryNode["kind"], string> = { start: "故事入口", scene: "视频场景", choice: "玩家选择", condition: "条件判断", setVariable: "修改变量", ending: "故事结局" };

type GraphData = { story: StoryNode; onSelect(id: string): void };

const StoryNodeView = memo(function StoryNodeView({ data, selected }: NodeProps<Node<GraphData>>) {
  const story = data.story;
  const handles = story.kind === "choice" ? story.choices.map((choice, index) => ({ id: choice.id, label: choice.label, top: 68 + index * 25 })) : story.kind === "condition" ? [{ id: "true", label: "成立", top: 70 }, { id: "false", label: "不成立", top: 96 }] : story.kind === "ending" ? [] : [{ id: "next", label: "下一步", top: 72 }];
  return <div className={`graph-node ${selected ? "selected" : ""}`} style={{ "--node-color": colors[story.kind], minHeight: Math.max(104, 70 + handles.length * 25) } as React.CSSProperties}>
    <Handle type="target" position={Position.Left} id="input" className="graph-handle input"/>
    <button className="graph-node-body" aria-label={story.title} onClick={() => data.onSelect(story.id)}><span>{labels[story.kind]}</span><strong>{story.title}</strong><small>{summary(story)}</small></button>
    {handles.map(handle => <div className="output-row" key={handle.id} style={{ top: handle.top }}><em>{handle.label}</em><Handle type="source" position={Position.Right} id={handle.id} className="graph-handle output"/></div>)}
  </div>;
});

const nodeTypes = { story: StoryNodeView };

export function StoryGraph(props: { project: Project; selectedId: string; overlay?: ReactNode; onSelect(id: string): void; onMove(id: string, x: number, y: number): void; onConnect(source: string, port: string, target: string): void; onDeleteNodes(ids: string[]): void; onDeleteEdges(ids: string[]): void }) {
  return <ReactFlowProvider><GraphInner {...props}/></ReactFlowProvider>;
}

function GraphInner({ project, selectedId, overlay, onSelect, onMove, onConnect, onDeleteNodes, onDeleteEdges }: Parameters<typeof StoryGraph>[0]) {
  const api = useReactFlow();
  const nodes = useMemo<Node<GraphData>[]>(() => project.nodes.map(story => ({ id: story.id, type: "story", position: story.position, selected: story.id === selectedId, data: { story, onSelect } })), [project.nodes, selectedId, onSelect]);
  const edges = useMemo<Edge[]>(() => project.edges.map(edge => ({ id: edge.id, source: edge.source, target: edge.target, sourceHandle: edge.sourcePort, targetHandle: "input", type: "default", animated: selectedId === edge.source, style: { stroke: selectedId === edge.source ? "#f0b429" : "#77818c", strokeWidth: 2 } })), [project.edges, selectedId]);
  const onNodesChange = useCallback((changes: NodeChange<Node<GraphData>>[]) => { for (const change of changes) { if (change.type === "position" && change.position && !change.dragging) onMove(change.id, change.position.x, change.position.y); if (change.type === "select" && change.selected) onSelect(change.id); if (change.type === "remove") onDeleteNodes([change.id]); } }, [onDeleteNodes, onMove, onSelect]);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => { const removed = changes.filter(change => change.type === "remove").map(change => change.id); if (removed.length) onDeleteEdges(removed); }, [onDeleteEdges]);
  const handleConnect = useCallback((connection: Connection) => { if (connection.source && connection.target && connection.sourceHandle) onConnect(connection.source, connection.sourceHandle, connection.target); }, [onConnect]);
  return <div className="story-graph" data-testid="story-graph">
    <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={handleConnect} fitView minZoom={0.12} maxZoom={2.5} snapToGrid snapGrid={[16,16]} panOnScroll selectionOnDrag connectionMode={ConnectionMode.Loose} deleteKeyCode={["Backspace","Delete"]} multiSelectionKeyCode="Shift" attributionPosition="bottom-left">
      <Background gap={20} size={1}/><MiniMap style={{ width: 140, height: 96 }} pannable zoomable nodeColor={node => colors[(node.data as GraphData).story.kind]}/><Controls showInteractive={false}/>
      {overlay}
      <div className="graph-toolbar"><button title="Fit view" aria-label="适应视图" onClick={() => api.fitView({ duration: 250, padding: 0.2 })}>适应画布</button></div>
    </ReactFlow>
  </div>;
}

function summary(node: StoryNode) { if (node.kind === "scene") return node.dialogue; if (node.kind === "choice") return `${node.choices.length} 个分支`; if (node.kind === "condition") return `变量 ${node.operator} ${String(node.value)}`; if (node.kind === "setVariable") return `${node.operation === "add" ? "增加" : "设为"} ${String(node.value)}`; if (node.kind === "ending") return node.endingTitle; return "故事起点"; }
