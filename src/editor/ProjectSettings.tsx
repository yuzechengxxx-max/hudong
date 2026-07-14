import type { Project } from "../core/project";

export function ProjectSettings({ project, onChange }: { project: Project; onChange(project: Project): void }) {
  const setDisplay = (patch: Partial<Project["display"]>) => onChange({ ...project, display: { ...project.display, ...patch } });
  const setUi = (patch: Partial<Project["ui"]>) => onChange({ ...project, ui: { ...project.ui, ...patch } });
  return <div className="side-panel project-settings">
    <label>项目名称<input value={project.title} onChange={event => onChange({ ...project, title: event.target.value })}/></label>
    <h3>画面</h3>
    <label>画面比例<select aria-label="画面比例" value={project.display.aspectRatio} onChange={event => setDisplay({ aspectRatio: event.target.value as Project["display"]["aspectRatio"] })}><option value="16:9">16:9</option><option value="21:9">21:9</option><option value="4:3">4:3</option></select></label>
    <div className="settings-grid"><label>输出宽度<input aria-label="输出宽度" type="number" min="320" max="7680" value={project.display.width} onChange={event => setDisplay({ width: Number(event.target.value) })}/></label><label>输出高度<input aria-label="输出高度" type="number" min="180" max="4320" value={project.display.height} onChange={event => setDisplay({ height: Number(event.target.value) })}/></label></div>
    <h3>互动 UI</h3>
    <label>强调色<div className="color-setting"><input aria-label="强调色" type="color" value={project.ui.accent} onChange={event => setUi({ accent: event.target.value })}/><span>{project.ui.accent}</span></div></label>
    <label>对话框透明度<input aria-label="对话框透明度" type="range" min="0.3" max="1" step="0.05" value={project.ui.dialogueOpacity} onChange={event => setUi({ dialogueOpacity: Number(event.target.value) })}/></label>
    <label>按钮圆角<input aria-label="按钮圆角" type="number" min="0" max="24" value={project.ui.buttonRadius} onChange={event => setUi({ buttonRadius: Number(event.target.value) })}/></label>
    <h3>编辑器主题</h3><div className="theme-choice active">深色专业主题</div><p className="panel-hint">浅色与跟随系统主题将在后续版本提供</p>
  </div>;
}
