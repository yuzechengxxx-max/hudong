import { LocateFixed, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { Project } from "../core/project";
import { changeVariableType, deleteUnusedVariable, indexVariableReferences, replaceAndDeleteVariable, updateVariable, type VariableType } from "./variableCommands";

type Props = {
  project: Project;
  onChange(project: Project): void;
  onNavigate(nodeId: string, chapterId: string): void;
  onAdd(): void;
};

const typeLabels: Record<VariableType, string> = { number: "数字", string: "文本", boolean: "开关" };

export function VariableManager({ project, onChange, onNavigate, onAdd }: Props) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"all" | VariableType>("all");
  const [typeError, setTypeError] = useState<{ variableId: string; type: VariableType; nodeIds: string[] }>();
  const [pendingDelete, setPendingDelete] = useState<string>();
  const [replacementId, setReplacementId] = useState("");
  const references = useMemo(() => indexVariableReferences(project), [project]);
  const variables = project.variables.filter(variable => variable.name.toLowerCase().includes(query.trim().toLowerCase()) && (type === "all" || variable.type === type));

  function setVariableType(variableId: string, nextType: VariableType) {
    const result = changeVariableType(project, variableId, nextType);
    if (result.ok) { setTypeError(undefined); onChange(result.project); }
    else setTypeError({ variableId, type: nextType, nodeIds: result.nodeIds });
  }

  function requestDelete(variableId: string) {
    const count = references.get(variableId)?.length ?? 0;
    if (!count) { onChange(deleteUnusedVariable(project, variableId)); return; }
    setPendingDelete(variableId);
    setReplacementId("");
  }

  return <section className="variable-manager">
    <div className="variable-manager-heading"><span>变量</span><button className="icon-text" onClick={onAdd}><Plus size={14}/> 新建变量</button></div>
    <div className="variable-tools"><label className="search"><Search size={14}/><input type="search" aria-label="搜索变量" placeholder="搜索变量" value={query} onChange={event => setQuery(event.target.value)}/></label><select aria-label="变量类型筛选" value={type} onChange={event => setType(event.target.value as "all" | VariableType)}><option value="all">全部类型</option><option value="number">数字</option><option value="string">文本</option><option value="boolean">开关</option></select></div>
    <div className="variable-list">{variables.map(variable => {
      const refs = references.get(variable.id) ?? [];
      const compatibleReplacements = project.variables.filter(item => item.id !== variable.id && item.type === variable.type);
      return <div className="variable-editor-row" key={variable.id}>
        <div className="variable-fields">
          <input aria-label={`变量名称 ${variable.name}`} value={variable.name} onChange={event => onChange(updateVariable(project, variable.id, { name: event.target.value || variable.name }))}/>
          <select aria-label={`变量类型 ${variable.name}`} value={variable.type} onChange={event => setVariableType(variable.id, event.target.value as VariableType)}><option value="number">数字</option><option value="string">文本</option><option value="boolean">开关</option></select>
          {variable.type === "boolean" ? <select aria-label={`默认值 ${variable.name}`} value={String(variable.initialValue)} onChange={event => onChange(updateVariable(project, variable.id, { initialValue: event.target.value === "true" }))}><option value="true">开启</option><option value="false">关闭</option></select> : <input aria-label={`默认值 ${variable.name}`} type={variable.type === "number" ? "number" : "text"} value={String(variable.initialValue)} onChange={event => onChange(updateVariable(project, variable.id, { initialValue: variable.type === "number" ? Number(event.target.value) : event.target.value }))}/>} 
          <button className="variable-locate" aria-label={`定位 ${variable.name} 的 ${refs.length} 个引用`} disabled={!refs.length} onClick={() => refs[0] && onNavigate(refs[0].nodeId, refs[0].chapterId)}><LocateFixed size={13}/>{refs.length} 个引用</button>
          <button className="variable-delete" aria-label={`删除变量 ${variable.name}`} onClick={() => requestDelete(variable.id)}><Trash2 size={13}/></button>
        </div>
        {typeError?.variableId === variable.id && <div className="variable-warning">{typeError.nodeIds.length} 个引用与{typeLabels[typeError.type]}类型不兼容</div>}
        {pendingDelete === variable.id && <div className="variable-replace"><span>先将 {refs.length} 个引用替换为：</span><select aria-label={`替代变量 ${variable.name}`} value={replacementId} onChange={event => setReplacementId(event.target.value)}><option value="">选择同类型变量</option>{compatibleReplacements.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button disabled={!replacementId} onClick={() => { onChange(replaceAndDeleteVariable(project, variable.id, replacementId)); setPendingDelete(undefined); }}>替换并删除</button><button onClick={() => setPendingDelete(undefined)}>取消</button></div>}
      </div>;
    })}</div>
    {!variables.length && <p className="panel-hint">没有符合条件的变量</p>}
  </section>;
}
