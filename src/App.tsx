import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Maximize2, Play, Plus, RotateCcw, Save, Search, Settings2, Trash2 } from "lucide-react";
import { diagnoseProject } from "./core/diagnostics";
import { createStarterProject, type Project, type StoryNode } from "./core/project";
import { createRuntime, type RuntimeSnapshot } from "./core/runtime";

const nodeColor: Record<StoryNode["kind"], string> = { start: "#83909c", scene: "#4b8fac", choice: "#d1a83d", condition: "#54a77b", setVariable: "#bd6d6d", ending: "#d46f48" };

export function App() {
  const [project, setProject] = useState<Project>(createStarterProject);
  const [selectedId, setSelectedId] = useState("choice");
  const [runtimeState, setRuntimeState] = useState<RuntimeSnapshot>(() => createRuntime(project).start());
  const [runtime, setRuntime] = useState(() => {
    const instance = createRuntime(project);
    instance.start();
    return instance;
  });
  const selected = project.nodes.find(node => node.id === selectedId) ?? project.nodes[0];
  const issues = useMemo(() => diagnoseProject(project), [project]);

  function saveProject() { localStorage.setItem("flowfilm-project", JSON.stringify(project)); }
  function addChoiceNode() {
    const id = `choice-${Date.now()}`;
    const node: StoryNode = { id, kind: "choice", title: "新选择", prompt: "请选择接下来的行动", position: { x: 430, y: 310 }, choices: [{ id: "option-a", label: "选项一" }, { id: "option-b", label: "选项二" }] };
    setProject(current => ({ ...current, nodes: [...current.nodes, node] })); setSelectedId(id);
  }
  function deleteSelected() {
    if (selected.kind === "start") return;
    setProject(current => ({ ...current, nodes: current.nodes.filter(node => node.id !== selectedId), edges: current.edges.filter(edge => edge.source !== selectedId && edge.target !== selectedId) })); setSelectedId("start");
  }
  function downloadProject() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(project, null, 2)], { type: "application/json;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `${project.title}.flowfilm.json`; link.click(); URL.revokeObjectURL(url);
  }
  function moveNode(id: string, x: number, y: number) { setProject(current => ({ ...current, nodes: current.nodes.map(node => node.id === id ? { ...node, position: { x, y } } : node) })); }

  function updateSelected(patch: Partial<StoryNode>) {
    setProject(current => ({ ...current, nodes: current.nodes.map(node => node.id === selectedId ? { ...node, ...patch } as StoryNode : node) }));
  }

  function restart() {
    const next = createRuntime(project);
    setRuntime(next);
    setRuntimeState(next.start());
  }

  function nextPreview() { setRuntimeState(runtime.advance()); }
  function choose(port: string) { setRuntimeState(runtime.choose(port)); }
  const previewNode = project.nodes.find(node => node.id === runtimeState.currentNodeId);

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand-mark">映流 <span>FlowFilm</span></div><div className="crumb">雾港来信 / 第一章</div>
      <div className="top-spacer" />
      <button className="toolbar-button" aria-label="保存项目" onClick={saveProject}><Save size={15}/> 保存项目</button>
      <button className="toolbar-button"><CheckCircle2 size={15}/> 项目检查 <b>{issues.length}</b></button>
      <button className="toolbar-button" onClick={restart}><Play size={15}/> 从此处试玩</button>
      <button className="publish" onClick={downloadProject}><Download size={15}/> 导出项目</button>
    </header>
    <main className="workspace">
      <aside className="left-rail">
        <div className="rail-tabs"><button className="active">节点</button><button>素材</button><button>项目</button></div>
        <label className="search"><Search size={14}/><input aria-label="搜索节点" placeholder="搜索节点或素材"/></label>
        <LibraryGroup title="叙事" items={[["scene","视频场景"],["scene","对白演出"],["choice","玩家选择"]]} onAdd={kind => kind === "choice" && addChoiceNode()} />
        <LibraryGroup title="逻辑" items={[["condition","条件判断"],["setVariable","修改变量"],["ending","故事结局"]]} onAdd={() => undefined} />
        <button className="add-node" onClick={addChoiceNode}><Plus size={15}/> 添加玩家选择</button>
      </aside>
      <section className="center">
        <div className="canvas">
          <div className="canvas-meta"><span>剧情图 · 第一章</span><span>78% · 自动保存于刚刚</span></div>
          <svg className="connections" viewBox="0 0 900 470" preserveAspectRatio="none"><path d="M195 230 C245 230 240 190 290 190"/><path d="M475 190 C525 190 510 230 560 230"/><path d="M745 230 C795 230 780 185 830 185"/></svg>
          {project.nodes.map(node => <button key={node.id} aria-label={node.title} className={`story-node ${selectedId === node.id ? "selected" : ""}`} style={{ left: node.position.x, top: node.position.y, "--node-color": nodeColor[node.kind] } as React.CSSProperties} onClick={() => setSelectedId(node.id)} draggable onDragEnd={event => { const bounds=event.currentTarget.parentElement?.getBoundingClientRect(); if(bounds) moveNode(node.id, Math.max(10,event.clientX-bounds.left-90), Math.max(45,event.clientY-bounds.top-45)); }}>
            <span className="node-type">{node.kind === "scene" ? "视频场景" : node.kind === "choice" ? "玩家选择" : node.kind === "ending" ? "故事结局" : "故事入口"}</span>
            <strong>{node.title}</strong><small>{node.kind === "choice" ? `${node.choices.length} 个选项` : node.kind === "scene" ? node.dialogue : node.kind === "ending" ? node.endingTitle : "自动进入下一段"}</small>
          </button>)}
          <PreviewDock node={previewNode} state={runtimeState} accent={project.ui.accent} onAdvance={nextPreview} onChoose={choose} onRestart={restart}/>
        </div>
        <div className="timeline">
          <div className="track-labels"><b>演出时间线</b><span>画面</span><span>字幕 / 对白</span><span>音乐 / 音效</span><span>互动</span></div>
          <div className="tracks"><div className="ruler">00:00　　　00:05　　　00:10　　　00:15</div><div className="clip video">雨夜码头.mp4</div><div className="clip dialogue">“那封信，真的来自他吗？”</div><div className="clip audio">雨声环境 + 悬疑配乐</div><div className="clip choice">显示选项</div></div>
        </div>
      </section>
      <aside className="inspector"><div className="inspector-title"><Settings2 size={16}/> 属性检查器</div><div className="form">
        <label>节点名称<input aria-label="节点名称" value={selected.title} onChange={event => updateSelected({ title: event.target.value })}/></label>
        {selected.kind === "choice" && <><label>画面提示<input value={selected.prompt} onChange={event => updateSelected({ prompt: event.target.value } as Partial<StoryNode>)}/></label>{selected.choices.map((choice, index) => <label key={choice.id}>选项 {index + 1}<input value={choice.label} onChange={event => updateSelected({ choices: selected.choices.map(item => item.id === choice.id ? { ...item, label: event.target.value } : item) } as Partial<StoryNode>)}/><small>连接到后续剧情节点</small></label>)}</>}
        {selected.kind === "scene" && <><label>角色<input value={selected.speaker} onChange={event => updateSelected({ speaker: event.target.value } as Partial<StoryNode>)}/></label><label>对白<textarea value={selected.dialogue} onChange={event => updateSelected({ dialogue: event.target.value } as Partial<StoryNode>)}/></label></>}
        <button className="danger-button" aria-label="删除选中节点" disabled={selected.kind === "start"} onClick={deleteSelected}><Trash2 size={14}/> 删除选中节点</button><div className="theme-section"><h3>游戏 UI</h3><label>强调色<input aria-label="强调色" type="color" value={project.ui.accent} onChange={event => setProject(current => ({ ...current, ui: { ...current.ui, accent: event.target.value } }))}/></label><label>对话框透明度<input type="range" min="0.3" max="1" step="0.05" value={project.ui.dialogueOpacity} onChange={event => setProject(current => ({ ...current, ui: { ...current.ui, dialogueOpacity: Number(event.target.value) } }))}/></label></div>
      </div></aside>
    </main>
    <footer className="statusbar"><span className="healthy"><CheckCircle2 size={12}/> 项目正常</span><span>{project.nodes.length} 个节点</span><span>1 个结局</span><span>预计游玩 4 分钟</span><span className="top-spacer"/><span>撤销 Ctrl+Z</span></footer>
  </div>;
}

function LibraryGroup({ title, items, onAdd }: { title: string; items: Array<[StoryNode["kind"], string]>; onAdd(kind: StoryNode["kind"]): void }) { return <section className="library-group"><h3>{title}</h3>{items.map(([kind,label]) => <button key={label} onClick={() => onAdd(kind)}><i style={{ background: nodeColor[kind] }}/>{label}</button>)}</section>; }

function PreviewDock({ node, state, accent, onAdvance, onChoose, onRestart }: { node?: StoryNode; state: RuntimeSnapshot; accent: string; onAdvance(): void; onChoose(id: string): void; onRestart(): void }) {
  return <section className="preview-dock" style={{ "--accent": accent } as React.CSSProperties}><header><b>实时预览</b><span>桌面 16:9</span><Maximize2 size={14}/></header><div className="preview-stage">
    {node?.kind === "scene" && <div className="dialogue-box"><b>{node.speaker}</b><p>{node.dialogue}</p><button aria-label="继续剧情" onClick={onAdvance}>继续</button></div>}
    {node?.kind === "choice" && <div className="choice-screen"><p>{node.prompt}</p>{node.choices.map(choice => <button key={choice.id} onClick={() => onChoose(choice.id)}>{choice.label}</button>)}</div>}
    {node?.kind === "ending" && <div className="ending-screen"><small>结局达成</small><h2>{node.endingTitle}</h2><button onClick={onRestart}><RotateCcw size={14}/> 重新试玩</button></div>}
    {state.status === "error" && <div className="ending-screen"><AlertTriangle/><h2>剧情连接异常</h2></div>}
  </div><footer><Play size={13}/><span>{state.status === "ended" ? "播放结束" : "00:08 / 00:24"}</span><span className="top-spacer"/>从选中节点同步</footer></section>;
}
