import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Download, FileJson, Film, Image as ImageIcon, Maximize2, Minus, Music, Play, Plus, RotateCcw, Save, Search, Trash2, Upload, X } from "lucide-react";
import { diagnoseProject } from "./core/diagnostics";
import { createNode, createStarterProject, ProjectSchema, type NodeKind, type Project, type StoryNode } from "./core/project";
import { createRuntime, type RuntimeSnapshot } from "./core/runtime";
import { ResizeHandle } from "./editor/ResizeHandle";
import { StoryGraph } from "./editor/StoryGraph";
import { duplicateSelection, removeSelection } from "./editor/projectCommands";

type Tab = "nodes" | "assets" | "project";
const labels: Record<NodeKind, string> = { start: "故事入口", scene: "视频场景", choice: "玩家选择", condition: "条件判断", setVariable: "修改变量", ending: "故事结局" };
const colors: Record<NodeKind, string> = { start: "#83909c", scene: "#4b8fac", choice: "#d1a83d", condition: "#54a77b", setVariable: "#bd6d6d", ending: "#d46f48" };

function loadInitialProject() {
  try { const saved = localStorage.getItem("flowfilm-project"); return saved ? ProjectSchema.parse(JSON.parse(saved)) : createStarterProject(); }
  catch { return createStarterProject(); }
}

export function App() {
  const [project, setProject] = useState<Project>(loadInitialProject);
  const [tab, setTab] = useState<Tab>("nodes");
  const [selectedIds, setSelectedIds] = useState<string[]>(() => [project.nodes.find(n => n.kind === "choice")?.id ?? project.nodes[0].id]);
  const [drawer, setDrawer] = useState<"assets" | "project" | undefined>();
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [savedAt, setSavedAt] = useState("尚未保存");
  const [saveStatus, setSaveStatus] = useState<"dirty" | "saving" | "saved" | "error">("dirty");
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [leftWidth, setLeftWidth] = useState(() => Number(localStorage.getItem("flowfilm-left-width")) || 230);
  const [rightWidth, setRightWidth] = useState(() => Number(localStorage.getItem("flowfilm-right-width")) || 330);
  const [timelineHeight, setTimelineHeight] = useState(() => Number(localStorage.getItem("flowfilm-timeline-height")) || 190);
  const [drawerWidth, setDrawerWidth] = useState(() => Number(localStorage.getItem("flowfilm-drawer-width")) || 340);
  const [runtime, setRuntime] = useState(() => { const value = createRuntime(project); value.start(); return value; });
  const [runtimeState, setRuntimeState] = useState<RuntimeSnapshot>(() => createRuntime(project).start());
  const importRef = useRef<HTMLInputElement>(null);
  const pastRef = useRef<Project[]>([]);
  const futureRef = useRef<Project[]>([]);
  const clipboardRef = useRef<string[]>([]);
  const drawerResizeRef = useRef<{ x: number; width: number } | undefined>(undefined);
  const selectedId = selectedIds.at(-1);
  const selected = project.nodes.find(node => node.id === selectedId);
  const issues = useMemo(() => diagnoseProject(project), [project]);
  const previewNode = project.nodes.find(node => node.id === runtimeState.currentNodeId);

  useEffect(() => {
    setSaveStatus("saving");
    const timer = window.setTimeout(() => { try { localStorage.setItem("flowfilm-project", JSON.stringify(project)); setSavedAt(new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })); setSaveStatus("saved"); } catch { setSaveStatus("error"); } }, 350);
    return () => window.clearTimeout(timer);
  }, [project]);
  useEffect(() => { localStorage.setItem("flowfilm-left-width", String(leftWidth)); localStorage.setItem("flowfilm-right-width", String(rightWidth)); localStorage.setItem("flowfilm-timeline-height", String(timelineHeight)); }, [leftWidth, rightWidth, timelineHeight]);
  useEffect(() => { localStorage.setItem("flowfilm-drawer-width", String(drawerWidth)); }, [drawerWidth]);

  function updateProject(mutator: (current: Project) => Project) {
    setProject(current => {
      const next = mutator(current);
      if (next === current) return current;
      pastRef.current = [...pastRef.current.slice(-79), current];
      futureRef.current = [];
      return next;
    });
  }
  function undo() {
    const previous = pastRef.current.at(-1);
    if (!previous) return;
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [project, ...futureRef.current].slice(0, 80);
    setProject(previous);
    setSelectedIds(ids => ids.filter(id => previous.nodes.some(node => node.id === id)));
  }
  function redo() {
    const next = futureRef.current[0];
    if (!next) return;
    futureRef.current = futureRef.current.slice(1);
    pastRef.current = [...pastRef.current.slice(-79), project];
    setProject(next);
    setSelectedIds(ids => ids.filter(id => next.nodes.some(node => node.id === id)));
  }
  function updateSelected(patch: Partial<StoryNode>) { if (!selectedId) return; updateProject(current => ({ ...current, nodes: current.nodes.map(node => node.id === selectedId ? { ...node, ...patch } as StoryNode : node) })); }
  function addNode(kind: Exclude<NodeKind, "start">, position?: { x: number; y: number }) { const created = createNode(kind, project.nodes.length); const node = position ? { ...created, position } : created; updateProject(current => ({ ...current, nodes: [...current.nodes, node] })); setSelectedIds([node.id]); setTab("nodes"); }
  function deleteSelected() { if (!selectedIds.some(id => project.nodes.find(node => node.id === id)?.kind !== "start")) return; updateProject(current => removeSelection(current, selectedIds)); setSelectedIds([]); }
  function moveNode(id: string, x: number, y: number) { updateProject(current => ({ ...current, nodes: current.nodes.map(node => node.id === id ? { ...node, position: { x, y } } : node) })); }
  function attachAsset(assetId: string, targetNodeId: string | undefined, x: number, y: number) {
    const asset = project.assets.find(item => item.id === assetId);
    if (!asset) return;
    if (targetNodeId) {
      updateProject(current => ({ ...current, nodes: current.nodes.map(node => node.id === targetNodeId && node.kind === "scene" ? { ...node, assetId: asset.id, mediaUrl: asset.url } : node) }));
      setSelectedIds([targetNodeId]);
      return;
    }
    const created = createNode("scene", project.nodes.length);
    const node = { ...created, title: asset.name.replace(/\.[^.]+$/, ""), position: { x, y }, assetId: asset.id, mediaUrl: asset.url };
    updateProject(current => ({ ...current, nodes: [...current.nodes, node] }));
    setSelectedIds([node.id]);
  }

  function outputPorts(node: StoryNode) {
    if (node.kind === "choice") return node.choices.map(choice => ({ value: choice.id, label: choice.label }));
    if (node.kind === "condition") return [{ value: "true", label: "条件成立" }, { value: "false", label: "条件不成立" }];
    if (node.kind === "ending") return [];
    return [{ value: "next", label: "下一步" }];
  }
  function connect(port: string, target: string) {
    if (!selectedId) return;
    updateProject(current => ({ ...current, edges: [...current.edges.filter(edge => !(edge.source === selectedId && edge.sourcePort === port)), { id: `edge-${selectedId}-${port}`, source: selectedId, sourcePort: port, target }] }));
  }
  function removeEdge(edgeId: string) { updateProject(current => ({ ...current, edges: current.edges.filter(edge => edge.id !== edgeId) })); }
  function addChoiceOption() {
    if (!selected || selected.kind !== "choice") return;
    const number = selected.choices.length + 1;
    updateSelected({ choices: [...selected.choices, { id: `option-${Date.now()}-${number}`, label: `新选项 ${number}` }] } as Partial<StoryNode>);
  }
  function moveChoiceOption(optionId: string, direction: -1 | 1) {
    if (!selected || selected.kind !== "choice") return;
    const index = selected.choices.findIndex(choice => choice.id === optionId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= selected.choices.length) return;
    const choices = [...selected.choices];
    [choices[index], choices[target]] = [choices[target], choices[index]];
    updateSelected({ choices } as Partial<StoryNode>);
  }
  function deleteChoiceOption(optionId: string) {
    if (!selected || selected.kind !== "choice" || selected.choices.length <= 1) return;
    updateProject(current => ({
      ...current,
      nodes: current.nodes.map(node => node.id === selected.id && node.kind === "choice" ? { ...node, choices: node.choices.filter(choice => choice.id !== optionId) } : node),
      edges: current.edges.filter(edge => !(edge.source === selected.id && edge.sourcePort === optionId)),
    }));
  }
  const selectNodes = useCallback((ids: string[]) => { setSelectedIds(current => current.length === ids.length && current.every((id, index) => id === ids[index]) ? current : ids); }, []);
  const connectGraph = useCallback((source: string, port: string, target: string) => updateProject(current => ({ ...current, edges: [...current.edges.filter(edge => !(edge.source === source && edge.sourcePort === port)), { id: `edge-${source}-${port}`, source, sourcePort: port, target }] })), []);
  const deleteGraphNodes = useCallback((ids: string[]) => { updateProject(current => removeSelection(current, ids)); setSelectedIds(current => current.filter(id => !ids.includes(id))); }, []);
  const deleteGraphEdges = useCallback((ids: string[]) => updateProject(current => ({ ...current, edges: current.edges.filter(edge => !ids.includes(edge.id)) })), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof Element && target.matches("input, textarea, select, [contenteditable='true']")) return;
      const command = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (command && key === "a") { event.preventDefault(); setSelectedIds(project.nodes.map(node => node.id)); return; }
      if (event.key === "Escape") { setSelectedIds([]); return; }
      if (command && key === "z") { event.preventDefault(); event.shiftKey ? redo() : undo(); return; }
      if (command && key === "y") { event.preventDefault(); redo(); return; }
      if (command && key === "c") { event.preventDefault(); clipboardRef.current = [...selectedIds]; return; }
      if (command && key === "x") { event.preventDefault(); clipboardRef.current = [...selectedIds]; deleteSelected(); return; }
      if (command && (key === "d" || key === "v")) {
        event.preventDefault();
        const sourceIds = key === "d" ? selectedIds : clipboardRef.current;
        if (!sourceIds.length) return;
        const result = duplicateSelection(project, sourceIds, 32, String(Date.now()));
        updateProject(() => result.project);
        setSelectedIds(result.selectedIds);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function saveProject() { try { localStorage.setItem("flowfilm-project", JSON.stringify(project)); setSavedAt("刚刚"); setSaveStatus("saved"); } catch { setSaveStatus("error"); } }
  function restart(fromSelected = false) { const next = createRuntime(project); setRuntime(next); setRuntimeState(next.start(fromSelected ? selectedId : undefined)); }
  function download(name: string, content: string, type: string) { const url = URL.createObjectURL(new Blob([content], { type })); const link = document.createElement("a"); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url); }
  function exportProject() { download(`${project.title}.flowfilm.json`, JSON.stringify(project, null, 2), "application/json;charset=utf-8"); }
  function exportWeb() { download(`${project.title}.html`, createPlayableHtml(project), "text/html;charset=utf-8"); }
  function importProject(file?: File) { if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const next = ProjectSchema.parse(JSON.parse(String(reader.result))); setProject(next); setSelectedIds([next.nodes[0].id]); restart(); } catch { window.alert("项目文件格式不正确"); } }; reader.readAsText(file, "utf-8"); }
  function importAsset(file?: File) {
    if (!file) return;
    const id = `asset-${Date.now()}`;
    updateProject(current => ({ ...current, assets: [...current.assets, { id, name: file.name, type: file.type || "application/octet-stream", size: file.size, url: "" }] }));
    const reader = new FileReader();
    reader.onload = () => updateProject(current => ({ ...current, assets: current.assets.map(asset => asset.id === id ? { ...asset, url: String(reader.result) } : asset) }));
    reader.readAsDataURL(file);
  }

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand-mark">映流 <span>FlowFilm</span></div><div className="crumb">{project.title} / 主剧情</div><div className="top-spacer" />
      <button className="toolbar-button" aria-label="保存项目" onClick={saveProject}><Save size={15}/> 保存</button>
      <button className="toolbar-button" onClick={() => setDrawer(value => value === "assets" ? undefined : "assets")}><Upload size={15}/> 素材</button>
      <button className="toolbar-button" onClick={() => setDrawer(value => value === "project" ? undefined : "project")}><FileJson size={15}/> 项目</button>
      <button className="toolbar-button" onClick={() => setShowDiagnostics(true)}><CheckCircle2 size={15}/> 项目检查 <b>{issues.length}</b></button>
      <button className="toolbar-button" onClick={() => { restart(true); setShowPlayer(true); }}><Play size={15}/> 从此处试玩</button>
      <button className="publish" onClick={exportWeb}><Download size={15}/> 导出网页作品</button>
    </header>

    <main className="work-area no-library" style={{ gridTemplateColumns: `minmax(0,1fr) 5px ${rightWidth}px` }}>
      <section className="center-stack">
        <StoryGraph project={project} selectedIds={selectedIds} onSelect={selectNodes} onMove={moveNode} onCreate={(kind, x, y) => addNode(kind, { x, y })} onConnect={connectGraph} onDeleteNodes={deleteGraphNodes} onDeleteEdges={deleteGraphEdges} onAssetDrop={attachAsset} overlay={<FloatingPreview><PreviewDock project={project} node={previewNode} state={runtimeState} onAdvance={() => setRuntimeState(runtime.advance())} onChoose={port => setRuntimeState(runtime.choose(port))} onRestart={() => restart(false)} onExpand={() => setShowPlayer(true)}/><div className="canvas-preview-actions"><button className="preview-command" onClick={() => restart(false)}><RotateCcw size={14}/> 从头预览</button><button className="preview-command" onClick={() => { restart(true); setShowPlayer(true); }}><Maximize2 size={14}/> 弹出试玩</button></div></FloatingPreview>}/>
        {timelineOpen ? <><ResizeHandle orientation="horizontal" onResize={delta => setTimelineHeight(value => Math.min(420, Math.max(110, value - delta)))}/><div data-testid="timeline-drawer" className="timeline-drawer" style={{ height: timelineHeight }}><Timeline selected={selected ?? project.nodes[0]}/></div></> : null}
      </section>
      <ResizeHandle orientation="vertical" onResize={delta => setRightWidth(value => Math.min(520, Math.max(260, value - delta)))}/>
      <aside className="inspector resizable-panel"><div className="inspector-title">属性</div><div className="form">{selected ? <>
        <Inspector project={project} selected={selected} updateSelected={updateSelected} onAddChoice={addChoiceOption} onMoveChoice={moveChoiceOption} onDeleteChoice={deleteChoiceOption}/>
        {outputPorts(selected).map(port => { const edge = project.edges.find(item => item.source === selected.id && item.sourcePort === port.value); return <div className="connection-row" key={port.value}><label>{port.label}<select aria-label={port.value === "next" ? "连接到" : `${port.label}连接到`} value={edge?.target ?? ""} onChange={event => event.target.value && connect(port.value, event.target.value)}><option value="">未连接</option>{project.nodes.filter(node => node.id !== selected.id).map(node => <option key={node.id} value={node.id}>{node.title}</option>)}</select></label>{edge && <><small>已连接到：{project.nodes.find(node => node.id === edge.target)?.title}</small><button className="icon-text" onClick={() => removeEdge(edge.id)}>断开</button></>}</div>; })}
        <button className="danger-button" aria-label="删除选中节点" disabled={selected.kind === "start"} onClick={deleteSelected}><Trash2 size={14}/> 删除选中节点</button>
        <div className="theme-section"><h3>游戏 UI</h3><label>强调色<input aria-label="强调色" type="color" value={project.ui.accent} onChange={event => updateProject(current => ({ ...current, ui: { ...current.ui, accent: event.target.value } }))}/></label><label>对话框透明度<input type="range" min="0.3" max="1" step="0.05" value={project.ui.dialogueOpacity} onChange={event => updateProject(current => ({ ...current, ui: { ...current.ui, dialogueOpacity: Number(event.target.value) } }))}/></label></div>
      </> : <div className="inspector-empty"><p>未选择节点</p><small>单击节点查看属性，或双击画布创建节点。</small></div>}</div></aside>
      {drawer && <aside className="workspace-drawer" style={{ width: drawerWidth }}><header><b>{drawer === "assets" ? "素材" : "项目"}</b><button aria-label="关闭面板" onClick={() => setDrawer(undefined)}><X size={16}/></button></header>{drawer === "assets" ? <AssetLibrary project={project} onImport={importAsset} onRemove={id => updateProject(current => ({ ...current, assets: current.assets.filter(asset => asset.id !== id), nodes: current.nodes.map(node => node.kind === "scene" && node.assetId === id ? { ...node, assetId: undefined, mediaUrl: "" } : node) }))}/> : <ProjectPanel project={project} onTitle={title => updateProject(current => ({ ...current, title }))} onExport={exportProject} onImport={() => importRef.current?.click()} onAddVariable={() => updateProject(current => ({ ...current, variables: [...current.variables, { id: `var-${Date.now()}`, name: "新变量", type: "number", initialValue: 0 }] }))}/>}<div className="drawer-resize" role="separator" aria-label={drawer === "assets" ? "调整素材面板宽度" : "调整项目面板宽度"} onPointerDown={event => { drawerResizeRef.current = { x: event.clientX, width: drawerWidth }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={event => { if (!drawerResizeRef.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return; setDrawerWidth(Math.min(620, Math.max(280, drawerResizeRef.current.width + event.clientX - drawerResizeRef.current.x))); }} onPointerUp={() => { drawerResizeRef.current = undefined; }}/></aside>}
      <input ref={importRef} hidden type="file" accept=".json,.flowfilm.json" onChange={event => importProject(event.target.files?.[0])}/>
    </main>
    <footer className="statusbar"><span className={issues.some(issue => issue.severity === "error") ? "unhealthy" : "healthy"}>{issues.length ? <AlertTriangle size={12}/> : <CheckCircle2 size={12}/>} {issues.length ? `${issues.length} 个问题` : "项目正常"}</span><span>{project.nodes.length} 个节点</span><span>{project.assets.length} 个素材</span><span>{project.variables.length} 个变量</span><span className={`save-state ${saveStatus}`}>{saveStatus === "saving" ? "保存中…" : saveStatus === "error" ? "保存失败" : saveStatus === "saved" ? `已保存 · ${savedAt}` : "有未保存修改"}</span><span className="top-spacer"/><button aria-label="演出时间线" className={timelineOpen ? "active" : ""} onClick={() => setTimelineOpen(value => !value)}>演出时间线</button><button onClick={() => { setLeftWidth(230); setRightWidth(330); setTimelineHeight(190); }}>恢复布局</button></footer>
    {showDiagnostics && <Modal title="项目检查" onClose={() => setShowDiagnostics(false)}><div className="issue-list">{issues.length ? issues.map((issue, index) => <button key={`${issue.code}-${index}`} onClick={() => { if (issue.nodeId) setSelectedIds([issue.nodeId]); setShowDiagnostics(false); }}><b>{issue.severity === "error" ? "错误" : "警告"}</b><span>{issue.message}</span></button>) : <div className="empty-state"><CheckCircle2 size={32}/><h3>项目可以发布</h3><p>没有发现剧情连接问题。</p></div>}</div></Modal>}
    {showPlayer && <Modal wide title="独立试玩" onClose={() => setShowPlayer(false)}><div className="full-player"><PreviewDock project={project} node={previewNode} state={runtimeState} onAdvance={() => setRuntimeState(runtime.advance())} onChoose={port => setRuntimeState(runtime.choose(port))} onRestart={() => restart(false)}/><aside><h3>运行状态</h3>{Object.entries(runtimeState.variables).map(([key, value]) => <p key={key}>{project.variables.find(item => item.id === key)?.name ?? key}<b>{String(value)}</b></p>)}<button onClick={() => restart(false)}><RotateCcw size={14}/> 从头开始</button></aside></div></Modal>}
  </div>;
}

function NodeLibrary({ onAdd }: { onAdd(kind: Exclude<NodeKind, "start">): void }) { return <><label className="search"><Search size={14}/><input aria-label="搜索节点" placeholder="搜索节点类型"/></label><section className="library-group"><h3>叙事</h3><LibraryButton kind="scene" onAdd={onAdd}/><LibraryButton kind="choice" onAdd={onAdd}/></section><section className="library-group"><h3>逻辑</h3><LibraryButton kind="condition" onAdd={onAdd}/><LibraryButton kind="setVariable" onAdd={onAdd}/><LibraryButton kind="ending" onAdd={onAdd}/></section><button className="add-node" onClick={() => onAdd("choice")}><Plus size={15}/> 添加玩家选择</button></>; }
function LibraryButton({ kind, onAdd }: { kind: Exclude<NodeKind, "start">; onAdd(kind: Exclude<NodeKind, "start">): void }) { return <button onClick={() => onAdd(kind)}><i style={{ background: colors[kind] }}/>{labels[kind]}</button>; }
function AssetLibrary({ project, onImport, onRemove }: { project: Project; onImport(file?: File): void; onRemove(id: string): void }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const assets = project.assets.filter(asset => asset.name.toLowerCase().includes(query.toLowerCase()) && (type === "all" || asset.type.startsWith(`${type}/`)));
  return <div className="side-panel asset-library"><div className="asset-tools"><label className="search"><Search size={14}/><input placeholder="搜索素材" value={query} onChange={event => setQuery(event.target.value)}/></label><select aria-label="素材类型" value={type} onChange={event => setType(event.target.value)}><option value="all">全部类型</option><option value="video">视频</option><option value="image">图片</option><option value="audio">音频</option></select></div><label className="upload-button"><Upload size={15}/> 导入素材<input aria-label="导入素材" hidden type="file" accept="video/*,audio/*,image/*" onChange={event => onImport(event.target.files?.[0])}/></label><div className="asset-grid">{assets.map(asset => <article className="asset-card" draggable onDragStart={event => { event.dataTransfer.effectAllowed = "copy"; event.dataTransfer.setData("application/x-flowfilm-asset", asset.id); }} key={asset.id}><div className="asset-preview">{asset.url ? asset.type.startsWith("image/") ? <img src={asset.url} alt={asset.name}/> : asset.type.startsWith("video/") ? <video src={asset.url} aria-label={asset.name} muted/> : asset.type.startsWith("audio/") ? <Music aria-label={asset.name}/> : <ImageIcon aria-label={asset.name}/> : <div className="asset-loading" aria-label={`正在读取 ${asset.name}`}><ImageIcon/></div>}<span>{asset.type.startsWith("video/") ? <Film size={13}/> : asset.type.startsWith("image/") ? <ImageIcon size={13}/> : <Music size={13}/>}</span></div><div className="asset-meta"><b title={asset.name}>{asset.name}</b><small>{asset.type || "未知类型"} · {(asset.size / 1024 / 1024).toFixed(1)} MB</small></div><button aria-label={`删除素材 ${asset.name}`} onClick={() => onRemove(asset.id)}><Trash2 size={14}/></button></article>)}</div>{!assets.length && <p className="panel-hint">{project.assets.length ? "没有符合筛选条件的素材。" : "导入视频、图片、音乐或音效，再在场景节点中选择使用。"}</p>}</div>;
}
function ProjectPanel({ project, onTitle, onExport, onImport, onAddVariable }: { project: Project; onTitle(value: string): void; onExport(): void; onImport(): void; onAddVariable(): void }) { return <div className="side-panel"><label>项目名称<input value={project.title} onChange={event => onTitle(event.target.value)}/></label><button className="panel-command" onClick={onExport}><FileJson size={15}/> 导出项目文件</button><button className="panel-command" onClick={onImport}><Upload size={15}/> 导入项目文件</button><h3>变量</h3>{project.variables.map(variable => <div className="variable-row" key={variable.id}><span>{variable.name}</span><b>{String(variable.initialValue)}</b></div>)}<button className="panel-command" onClick={onAddVariable}><Plus size={15}/> 新建变量</button></div>; }

function Inspector({ project, selected, updateSelected, onAddChoice, onMoveChoice, onDeleteChoice }: { project: Project; selected: StoryNode; updateSelected(patch: Partial<StoryNode>): void; onAddChoice(): void; onMoveChoice(id: string, direction: -1 | 1): void; onDeleteChoice(id: string): void }) {
  return <>
    <label>节点名称<input aria-label="节点名称" value={selected.title} onChange={event => updateSelected({ title: event.target.value })}/></label>
    {selected.kind === "scene" && <>
      <label>素材<select aria-label="场景素材" value={selected.assetId ?? ""} onChange={event => { const asset = project.assets.find(item => item.id === event.target.value); updateSelected({ assetId: asset?.id, mediaUrl: asset?.url ?? "" } as Partial<StoryNode>); }}><option value="">无素材</option>{project.assets.map(asset => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select></label>
      {selected.assetId && (() => { const asset = project.assets.find(item => item.id === selected.assetId); return asset ? <div className="inspector-asset-preview">{asset.type.startsWith("image/") ? <img src={asset.url} alt={asset.name}/> : asset.type.startsWith("video/") ? <video src={asset.url} aria-label={asset.name} muted/> : <Music/>}<span><b>{asset.name}</b><small>{asset.type}</small></span></div> : null; })()}
      <label className="toggle-row"><input aria-label="显示对话框" type="checkbox" checked={selected.showDialogue} onChange={event => updateSelected({ showDialogue: event.target.checked } as Partial<StoryNode>)}/><span>显示对话框</span></label>
      {selected.showDialogue && <><label>角色<input aria-label="角色" value={selected.speaker} onChange={event => updateSelected({ speaker: event.target.value } as Partial<StoryNode>)}/></label><label>对白<textarea aria-label="对白" value={selected.dialogue} onChange={event => updateSelected({ dialogue: event.target.value } as Partial<StoryNode>)}/></label></>}
    </>}
    {selected.kind === "choice" && <>
      <label>画面提示<input value={selected.prompt} onChange={event => updateSelected({ prompt: event.target.value } as Partial<StoryNode>)}/></label>
      <div className="choice-editor">{selected.choices.map((choice, index) => <div className="choice-editor-row" key={choice.id}><input aria-label={`选项 ${index + 1}`} value={choice.label} onChange={event => updateSelected({ choices: selected.choices.map(item => item.id === choice.id ? { ...item, label: event.target.value } : item) } as Partial<StoryNode>)}/><button aria-label={`上移选项 ${choice.label}`} disabled={index === 0} onClick={() => onMoveChoice(choice.id, -1)}><ChevronUp size={14}/></button><button aria-label={`下移选项 ${choice.label}`} disabled={index === selected.choices.length - 1} onClick={() => onMoveChoice(choice.id, 1)}><ChevronDown size={14}/></button><button aria-label={`删除选项 ${choice.label}`} disabled={selected.choices.length === 1} onClick={() => onDeleteChoice(choice.id)}><Trash2 size={14}/></button></div>)}</div>
      <button className="panel-command" onClick={onAddChoice}><Plus size={14}/> 添加选项</button>
    </>}
    {(selected.kind === "condition" || selected.kind === "setVariable") && <label>变量<select value={selected.variableId} onChange={event => updateSelected({ variableId: event.target.value } as Partial<StoryNode>)}>{project.variables.map(variable => <option key={variable.id} value={variable.id}>{variable.name}</option>)}</select></label>}
    {selected.kind === "condition" && <><label>比较方式<select value={selected.operator} onChange={event => updateSelected({ operator: event.target.value as "eq"|"gte"|"lte" } as Partial<StoryNode>)}><option value="gte">大于等于</option><option value="lte">小于等于</option><option value="eq">等于</option></select></label><label>比较值<input type="number" value={Number(selected.value)} onChange={event => updateSelected({ value: Number(event.target.value) } as Partial<StoryNode>)}/></label></>}
    {selected.kind === "setVariable" && <><label>操作<select value={selected.operation} onChange={event => updateSelected({ operation: event.target.value as "set"|"add" } as Partial<StoryNode>)}><option value="add">增加</option><option value="set">设为</option></select></label><label>数值<input type="number" value={Number(selected.value)} onChange={event => updateSelected({ value: Number(event.target.value) } as Partial<StoryNode>)}/></label></>}
    {selected.kind === "ending" && <label>结局标题<input value={selected.endingTitle} onChange={event => updateSelected({ endingTitle: event.target.value } as Partial<StoryNode>)}/></label>}
  </>;
}

function DynamicEdges({ project }: { project: Project }) { return <svg className="connections">{project.edges.map(edge => { const source = project.nodes.find(node => node.id === edge.source); const target = project.nodes.find(node => node.id === edge.target); if (!source || !target) return null; const x1 = source.position.x + 185, y1 = source.position.y + 48, x2 = target.position.x, y2 = target.position.y + 48; return <path key={edge.id} d={`M ${x1} ${y1} C ${x1 + 55} ${y1}, ${x2 - 55} ${y2}, ${x2} ${y2}`}/>; })}</svg>; }
function Timeline({ selected }: { selected: StoryNode }) { return <div className="timeline"><div className="track-labels"><b>演出时间线</b><span>画面</span><span>字幕 / 对白</span><span>音乐 / 音效</span><span>互动</span></div><div className="tracks"><div className="ruler">00:00　　　00:05　　　00:10　　　00:15</div><div className="clip video">{selected.kind === "scene" ? selected.title : "选择场景节点编辑演出"}</div><div className="clip dialogue">{selected.kind === "scene" ? selected.dialogue : "字幕轨道"}</div><div className="clip audio">环境音与配乐轨道</div><div className="clip choice">{selected.kind === "choice" ? "显示选项" : "互动轨道"}</div></div></div>; }
function FloatingPreview({ children }: { children: React.ReactNode }) {
  const [position, setPosition] = useState(() => { try { return JSON.parse(localStorage.getItem("flowfilm-preview-position") ?? "null") ?? { x: 12, y: 12 }; } catch { return { x: 12, y: 12 }; } });
  const [width, setWidth] = useState(() => Number(localStorage.getItem("flowfilm-preview-width")) || 280);
  const [collapsed, setCollapsed] = useState(false);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | undefined>(undefined);
  const resize = useRef<{ x: number; width: number } | undefined>(undefined);
  useEffect(() => { localStorage.setItem("flowfilm-preview-position", JSON.stringify(position)); localStorage.setItem("flowfilm-preview-width", String(width)); }, [position, width]);
  return <section className={`floating-preview nodrag nopan nowheel ${collapsed ? "collapsed" : ""}`} style={{ left: position.x, top: position.y, width }}>
    <header className="floating-preview-title" onPointerDown={event => { drag.current = { x: event.clientX, y: event.clientY, left: position.x, top: position.y }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={event => { if (!drag.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return; setPosition({ x: Math.max(0, drag.current.left + event.clientX - drag.current.x), y: Math.max(0, drag.current.top + event.clientY - drag.current.y) }); }} onPointerUp={() => { drag.current = undefined; }}><b>试玩预览</b><button aria-label="重置预览位置" onPointerDown={event => event.stopPropagation()} onClick={() => { setPosition({ x: 12, y: 12 }); setWidth(280); }}><RotateCcw size={13}/></button><button aria-label={collapsed ? "展开预览" : "收起预览"} onPointerDown={event => event.stopPropagation()} onClick={() => setCollapsed(value => !value)}>{collapsed ? <Maximize2 size={13}/> : <Minus size={13}/>}</button></header>
    {!collapsed && <div className="floating-preview-content">{children}<div className="preview-resize" role="separator" aria-label="调整预览大小" onPointerDown={event => { resize.current = { x: event.clientX, width }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={event => { if (!resize.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return; setWidth(Math.min(520, Math.max(240, resize.current.width + event.clientX - resize.current.x))); }} onPointerUp={() => { resize.current = undefined; }}/></div>}
  </section>;
}
function PreviewDock({ project, node, state, onAdvance, onChoose, onRestart, onExpand }: { project: Project; node?: StoryNode; state: RuntimeSnapshot; onAdvance(): void; onChoose(port: string): void; onRestart(): void; onExpand?: () => void }) {
  const asset = node?.kind === "scene" ? project.assets.find(item => item.id === node.assetId) : undefined;
  const isVideo = asset?.type.startsWith("video/") ?? false;
  return <section className="preview-dock" style={{ "--accent": project.ui.accent, "--dialogue-opacity": project.ui.dialogueOpacity, "--button-radius": `${project.ui.buttonRadius}px` } as React.CSSProperties}>
    <header><b>实时预览</b><span>16:9</span>{onExpand && <button aria-label="展开试玩" onClick={onExpand}><Maximize2 size={14}/></button>}</header>
    <div className="preview-stage">
      {asset?.type.startsWith("image/") && <img src={asset.url} alt="场景"/>}
      {isVideo && <video src={asset?.url} autoPlay muted onEnded={node?.kind === "scene" && !node.showDialogue ? onAdvance : undefined}/>} 
      {node?.kind === "scene" && node.showDialogue && <div className="dialogue-box"><b>{node.speaker}</b><p>{node.dialogue}</p><button aria-label="继续剧情" onClick={onAdvance}>继续</button></div>}
      {node?.kind === "scene" && !node.showDialogue && !isVideo && <button className="scene-continue" aria-label="继续剧情" onClick={onAdvance}>继续</button>}
      {node?.kind === "choice" && <div className="choice-screen"><p>{node.prompt}</p>{node.choices.map(choice => <button key={choice.id} onClick={() => onChoose(choice.id)}>{choice.label}</button>)}</div>}
      {node?.kind === "ending" && <div className="ending-screen"><small>结局达成</small><h2>{node.endingTitle}</h2><button onClick={onRestart}><RotateCcw size={14}/> 重新试玩</button></div>}
      {state.status === "error" && <div className="ending-screen"><AlertTriangle/><h2>剧情连接异常</h2><p>请检查当前节点的出口。</p></div>}
    </div>
    <footer><Play size={13}/><span>{state.status === "ended" ? "播放结束" : labels[node?.kind ?? "start"]}</span><span className="top-spacer"/>已访问 {state.visitedNodeIds.length} 个节点</footer>
  </section>;
}
function Modal({ title, onClose, wide, children }: { title: string; onClose(): void; wide?: boolean; children: React.ReactNode }) { return <div className="modal-backdrop"><section className={`modal ${wide ? "wide" : ""}`}><header><h2>{title}</h2><button aria-label="关闭" onClick={onClose}><X size={18}/></button></header><div className="modal-body">{children}</div></section></div>; }
function nodeSummary(node: StoryNode) { if (node.kind === "scene") return node.dialogue; if (node.kind === "choice") return `${node.choices.length} 个选项`; if (node.kind === "condition") return `当变量 ${node.operator} ${String(node.value)}`; if (node.kind === "setVariable") return `${node.operation === "add" ? "增加" : "设为"} ${String(node.value)}`; if (node.kind === "ending") return node.endingTitle; return "自动进入下一步"; }

export function createPlayableHtml(project: Project) {
  const data = JSON.stringify(project).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${project.title}</title><style>html,body,#app{margin:0;width:100%;height:100%;background:#080a0d;color:#fff;font-family:system-ui,"Microsoft YaHei"}#app{display:grid;place-items:center}.stage{width:min(100vw,1200px);aspect-ratio:16/9;position:relative;background:#18212a center/cover no-repeat;overflow:hidden}.stage video,.stage img{width:100%;height:100%;object-fit:cover}.dialog{position:absolute;left:6%;right:6%;bottom:6%;padding:18px;background:rgba(5,7,9,.86);border-left:4px solid ${project.ui.accent}}button{display:block;width:min(80%,520px);margin:10px auto;padding:14px;border:1px solid ${project.ui.accent};border-radius:${project.ui.buttonRadius}px;background:#111b;color:#fff}.compact{position:absolute;right:3%;bottom:3%;width:auto;padding:9px 14px}.ending{text-align:center;margin-top:25%}</style><div id="app"></div><script>const project=${data};let vars=Object.fromEntries(project.variables.map(v=>[v.id,v.initialValue]));const app=document.querySelector('#app');const node=id=>project.nodes.find(n=>n.id===id);const next=(id,p)=>project.edges.find(e=>e.source===id&&e.sourcePort===p)?.target;function go(id){const n=node(id);if(!n)return app.innerHTML='<h2>剧情连接异常</h2>';if(n.kind==='start')return go(next(n.id,'next'));if(n.kind==='setVariable'){vars[n.variableId]=n.operation==='add'?Number(vars[n.variableId]||0)+Number(n.value):n.value;return go(next(n.id,'next'))}if(n.kind==='condition'){const l=vars[n.variableId]||0,ok=n.operator==='eq'?l===n.value:n.operator==='gte'?Number(l)>=Number(n.value):Number(l)<=Number(n.value);return go(next(n.id,ok?'true':'false'))}const asset=n.assetId&&project.assets.find(a=>a.id===n.assetId),isVideo=!!asset&&asset.type.startsWith('video/');let media=asset?(isVideo?'<video autoplay muted src="'+asset.url+'"></video>':'<img src="'+asset.url+'">'):'';if(n.kind==='scene'){const overlay=n.showDialogue?'<div class="dialog"><b>'+n.speaker+'</b><p>'+n.dialogue+'</p><button id="next">继续</button></div>':isVideo?'':'<button class="compact" id="next">继续</button>';app.innerHTML='<div class="stage">'+media+overlay+'</div>';const video=document.querySelector('video');if(!n.showDialogue&&video)video.onended=()=>go(next(n.id,'next'));else document.querySelector('#next').onclick=()=>go(next(n.id,'next'))}if(n.kind==='choice'){app.innerHTML='<div class="stage"><div class="dialog"><p>'+n.prompt+'</p>'+n.choices.map(c=>'<button data-port="'+c.id+'">'+c.label+'</button>').join('')+'</div></div>';document.querySelectorAll('[data-port]').forEach(b=>b.onclick=()=>go(next(n.id,b.dataset.port)))}if(n.kind==='ending')app.innerHTML='<div class="stage"><div class="ending"><small>结局达成</small><h1>'+n.endingTitle+'</h1><button id="restart">重新开始</button></div></div>',document.querySelector('#restart').onclick=start}function start(){vars=Object.fromEntries(project.variables.map(v=>[v.id,v.initialValue]));go(project.nodes.find(n=>n.kind==='start').id)}start();<\/script></html>`;
}
