import { ChevronDown, ChevronUp, Music, Plus, Trash2 } from "lucide-react";
import type { ComparisonOperator, Project, StoryNode, VariableOperation } from "../core/project";

interface NodeInspectorProps {
  project: Project;
  selectedId: string;
  onChange(project: Project): void;
}

const operationLabels: Record<VariableOperation, string> = { set: "设为", add: "增加", subtract: "减少", multiply: "乘以", divide: "除以", append: "追加文本", toggle: "切换" };
const comparisonLabels: Record<ComparisonOperator, string> = { eq: "等于", neq: "不等于", gt: "大于", gte: "大于等于", lt: "小于", lte: "小于等于", contains: "包含", notContains: "不包含" };

export function NodeInspector({ project, selectedId, onChange }: NodeInspectorProps) {
  const selected = project.nodes.find(node => node.id === selectedId);
  if (!selected) return null;
  const update = (patch: Partial<StoryNode>) => onChange({ ...project, nodes: project.nodes.map(node => node.id === selected.id ? { ...node, ...patch } as StoryNode : node) });
  const variable = (selected.kind === "condition" || selected.kind === "setVariable") ? project.variables.find(item => item.id === selected.variableId) : undefined;
  const audioAssets = project.assets.filter(asset => asset.type.startsWith("audio/"));

  const updateOptions = (choices: Array<{ id: string; label: string }>) => update({ choices } as Partial<StoryNode>);
  const removePort = (portId: string, patch: Partial<StoryNode>) => onChange({
    ...project,
    nodes: project.nodes.map(node => node.id === selected.id ? { ...node, ...patch } as StoryNode : node),
    edges: project.edges.filter(edge => !(edge.source === selected.id && edge.sourcePort === portId)),
  });

  return <>
    <label>节点名称<input aria-label="节点名称" value={selected.title} onChange={event => update({ title: event.target.value })}/></label>
    {selected.kind === "scene" && <SceneFields project={project} node={selected} update={update}/>} 
    {(selected.kind === "choice" || selected.kind === "timedChoice") && <>
      <label>画面提示<input aria-label="画面提示" value={selected.prompt} onChange={event => update({ prompt: event.target.value } as Partial<StoryNode>)}/></label>
      {selected.kind === "timedChoice" && <SecondsField label="选择时限（秒）" value={selected.durationMs} onChange={durationMs => update({ durationMs } as Partial<StoryNode>)}/>} 
      <OptionEditor choices={selected.choices} minimum={1} onChange={updateOptions} onRemove={(id, choices) => removePort(id, { choices } as Partial<StoryNode>)}/>
    </>}
    {selected.kind === "random" && <>
      <div className="choice-editor">{selected.branches.map((branch, index) => <div className="choice-editor-row branch-editor-row" key={branch.id}>
        <input aria-label={`分支 ${index + 1}`} value={branch.label} onChange={event => update({ branches: selected.branches.map(item => item.id === branch.id ? { ...item, label: event.target.value } : item) } as Partial<StoryNode>)}/>
        <input aria-label={`权重 ${branch.label}`} type="number" min="1" max="999" value={branch.weight} onChange={event => update({ branches: selected.branches.map(item => item.id === branch.id ? { ...item, weight: Math.max(1, Number(event.target.value)) } : item) } as Partial<StoryNode>)}/>
        <button aria-label={`删除分支 ${branch.label}`} disabled={selected.branches.length <= 2} onClick={() => removePort(branch.id, { branches: selected.branches.filter(item => item.id !== branch.id) } as Partial<StoryNode>)}><Trash2 size={14}/></button>
      </div>)}</div>
      <button className="panel-command" disabled={selected.branches.length >= 8} onClick={() => { const number = selected.branches.length + 1; update({ branches: [...selected.branches, { id: `branch-${Date.now()}-${number}`, label: `分支${number}`, weight: 1 }] } as Partial<StoryNode>); }}><Plus size={14}/> 添加分支</button>
    </>}
    {(selected.kind === "condition" || selected.kind === "setVariable") && <label>变量<select aria-label="变量" value={selected.variableId} onChange={event => update({ variableId: event.target.value } as Partial<StoryNode>)}>{project.variables.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
    {selected.kind === "condition" && <ConditionFields node={selected} variableType={variable?.type ?? "number"} update={update}/>} 
    {selected.kind === "setVariable" && <VariableFields node={selected} variableType={variable?.type ?? "number"} update={update}/>} 
    {selected.kind === "wait" && <SecondsField label="等待时长（秒）" value={selected.durationMs} onChange={durationMs => update({ durationMs } as Partial<StoryNode>)}/>} 
    {selected.kind === "music" && <>
      <label>音乐操作<select aria-label="音乐操作" value={selected.action} onChange={event => update({ action: event.target.value as "play" | "stop" | "fadeOut" } as Partial<StoryNode>)}><option value="play">播放</option><option value="stop">停止</option><option value="fadeOut">淡出</option></select></label>
      {selected.action === "play" && <AudioFields assets={audioAssets} assetId={selected.assetId ?? ""} volume={selected.volume} onAsset={assetId => update({ assetId } as Partial<StoryNode>)} onVolume={volume => update({ volume } as Partial<StoryNode>)}/>} 
    </>}
    {selected.kind === "sound" && <AudioFields assets={audioAssets} assetId={selected.assetId} volume={selected.volume} onAsset={assetId => update({ assetId } as Partial<StoryNode>)} onVolume={volume => update({ volume } as Partial<StoryNode>)}/>} 
    {selected.kind === "chapter" && <label>章节标识<input aria-label="章节标识" value={selected.chapterId} onChange={event => update({ chapterId: event.target.value } as Partial<StoryNode>)}/></label>}
    {selected.kind === "jump" && <label>目标章节<select aria-label="目标章节" value={selected.chapterId} onChange={event => update({ chapterId: event.target.value } as Partial<StoryNode>)}><option value="">选择章节</option>{project.nodes.filter((node): node is Extract<StoryNode, { kind: "chapter" }> => node.kind === "chapter").map(node => <option key={node.id} value={node.chapterId}>{node.title}</option>)}</select></label>}
    {selected.kind === "ending" && <label>结局标题<input aria-label="结局标题" value={selected.endingTitle} onChange={event => update({ endingTitle: event.target.value } as Partial<StoryNode>)}/></label>}
  </>;
}

function SceneFields({ project, node, update }: { project: Project; node: Extract<StoryNode, { kind: "scene" }>; update(patch: Partial<StoryNode>): void }) {
  const asset = project.assets.find(item => item.id === node.assetId);
  return <><label>素材<select aria-label="场景素材" value={node.assetId ?? ""} onChange={event => { const next = project.assets.find(item => item.id === event.target.value); update({ assetId: next?.id, mediaUrl: next?.url ?? "" } as Partial<StoryNode>); }}><option value="">无素材</option>{project.assets.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    {asset && <div className="inspector-asset-preview">{asset.type.startsWith("image/") ? <img className="contain-media" src={asset.url} alt={asset.name}/> : asset.type.startsWith("video/") ? <video className="contain-media" src={asset.url} aria-label={asset.name} muted/> : <Music/>}<span><b>{asset.name}</b><small>{asset.type}</small></span></div>}
    <label className="toggle-row"><input aria-label="显示对话框" type="checkbox" checked={node.showDialogue} onChange={event => update({ showDialogue: event.target.checked } as Partial<StoryNode>)}/><span>显示对话框</span></label>
    {node.showDialogue && <><label>角色<input aria-label="角色" value={node.speaker} onChange={event => update({ speaker: event.target.value } as Partial<StoryNode>)}/></label><label>对白<textarea aria-label="对白" value={node.dialogue} onChange={event => update({ dialogue: event.target.value } as Partial<StoryNode>)}/></label></>}
  </>;
}

function OptionEditor({ choices, minimum, onChange, onRemove }: { choices: Array<{ id: string; label: string }>; minimum: number; onChange(choices: Array<{ id: string; label: string }>): void; onRemove(id: string, choices: Array<{ id: string; label: string }>): void }) {
  const move = (index: number, direction: -1 | 1) => { const next = [...choices]; const target = index + direction; [next[index], next[target]] = [next[target], next[index]]; onChange(next); };
  return <><div className="choice-editor">{choices.map((choice, index) => <div className="choice-editor-row" key={choice.id}><input aria-label={`选项 ${index + 1}`} value={choice.label} onChange={event => onChange(choices.map(item => item.id === choice.id ? { ...item, label: event.target.value } : item))}/><button aria-label={`上移选项 ${choice.label}`} disabled={index === 0} onClick={() => move(index, -1)}><ChevronUp size={14}/></button><button aria-label={`下移选项 ${choice.label}`} disabled={index === choices.length - 1} onClick={() => move(index, 1)}><ChevronDown size={14}/></button><button aria-label={`删除选项 ${choice.label}`} disabled={choices.length <= minimum} onClick={() => onRemove(choice.id, choices.filter(item => item.id !== choice.id))}><Trash2 size={14}/></button></div>)}</div><button className="panel-command" onClick={() => { const number = choices.length + 1; onChange([...choices, { id: `option-${Date.now()}-${number}`, label: `新选项 ${number}` }]); }}><Plus size={14}/> 添加选项</button></>;
}

function ConditionFields({ node, variableType, update }: { node: Extract<StoryNode, { kind: "condition" }>; variableType: "number" | "string" | "boolean"; update(patch: Partial<StoryNode>): void }) {
  const operators: ComparisonOperator[] = variableType === "number" ? ["eq", "neq", "gt", "gte", "lt", "lte"] : variableType === "string" ? ["eq", "neq", "contains", "notContains"] : ["eq", "neq"];
  return <><label>比较方式<select aria-label="比较方式" value={node.operator} onChange={event => update({ operator: event.target.value as ComparisonOperator } as Partial<StoryNode>)}>{operators.map(operator => <option key={operator} value={operator}>{comparisonLabels[operator]}</option>)}</select></label><ValueField label="比较值" type={variableType} value={node.value} onChange={value => update({ value } as Partial<StoryNode>)}/></>;
}

function VariableFields({ node, variableType, update }: { node: Extract<StoryNode, { kind: "setVariable" }>; variableType: "number" | "string" | "boolean"; update(patch: Partial<StoryNode>): void }) {
  const operations: VariableOperation[] = variableType === "number" ? ["set", "add", "subtract", "multiply", "divide"] : variableType === "string" ? ["set", "append"] : ["set", "toggle"];
  return <><label>操作<select aria-label="操作" value={node.operation} onChange={event => update({ operation: event.target.value as VariableOperation } as Partial<StoryNode>)}>{operations.map(operation => <option key={operation} value={operation}>{operationLabels[operation]}</option>)}</select></label>{node.operation !== "toggle" && <ValueField label="数值" type={variableType} value={node.value} onChange={value => update({ value } as Partial<StoryNode>)}/>}</>;
}

function ValueField({ label, type, value, onChange }: { label: string; type: "number" | "string" | "boolean"; value: string | number | boolean; onChange(value: string | number | boolean): void }) {
  if (type === "boolean") return <label>{label}<select aria-label={label} value={String(value)} onChange={event => onChange(event.target.value === "true")}><option value="true">是</option><option value="false">否</option></select></label>;
  return <label>{label}<input aria-label={label} type={type === "number" ? "number" : "text"} value={String(value)} onChange={event => onChange(type === "number" ? Number(event.target.value) : event.target.value)}/></label>;
}

function SecondsField({ label, value, onChange }: { label: string; value: number; onChange(value: number): void }) { return <label>{label}<input aria-label={label} type="number" min="0.1" step="0.1" value={value / 1000} onChange={event => onChange(Math.max(100, Number(event.target.value) * 1000))}/></label>; }

function AudioFields({ assets, assetId, volume, onAsset, onVolume }: { assets: Project["assets"]; assetId: string; volume: number; onAsset(value: string): void; onVolume(value: number): void }) { return <><label>音频素材<select aria-label="音频素材" value={assetId} onChange={event => onAsset(event.target.value)}><option value="">选择音频</option>{assets.map(asset => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select></label><label>音量<input aria-label="音量" type="range" min="0" max="1" step="0.05" value={volume} onChange={event => onVolume(Number(event.target.value))}/></label></>; }
