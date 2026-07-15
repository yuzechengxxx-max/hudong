import { ChevronDown, ChevronUp, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import type { Project } from "../core/project";

type Props = {
  project: Project;
  activeChapterId: string;
  issueCounts: Record<string, number>;
  onSelect(chapterId: string): void;
  onCreate(): void;
  onRename(chapterId: string, name: string): void;
  onDuplicate(chapterId: string): void;
  onReorder(chapterId: string, direction: "up" | "down"): void;
  onDelete(chapterId: string): void;
};

export function ChapterManager({ project, activeChapterId, issueCounts, onSelect, onCreate, onRename, onDuplicate, onReorder, onDelete }: Props) {
  const chapters = [...project.chapters].sort((a, b) => a.order - b.order);
  return <div className="chapter-manager">
    <div className="chapter-manager-heading"><span>章节</span><button className="icon-text" onClick={onCreate}><Plus size={14}/> 新建章节</button></div>
    <div className="chapter-list">{chapters.map((chapter, index) => {
      const nodeCount = project.nodes.filter(node => node.chapterId === chapter.id).length;
      const issueCount = issueCounts[chapter.id] ?? 0;
      return <div className={`chapter-row ${chapter.id === activeChapterId ? "active" : ""}`} key={chapter.id}>
        <button className="chapter-main" aria-label={`打开章节 ${chapter.name}`} onClick={() => onSelect(chapter.id)}><span><b>{chapter.name}</b>{chapter.id === project.defaultChapterId && <small>默认</small>}</span><em>{nodeCount} 个节点</em>{issueCount > 0 && <em className="chapter-issues">{issueCount} 个问题</em>}</button>
        <div className="chapter-actions">
          <button title="重命名" aria-label={`重命名 ${chapter.name}`} onClick={() => { const name = window.prompt("章节名称", chapter.name); if (name?.trim()) onRename(chapter.id, name); }}><Pencil size={13}/></button>
          <button title="复制章节" aria-label={`复制 ${chapter.name}`} onClick={() => onDuplicate(chapter.id)}><Copy size={13}/></button>
          <button title="上移" aria-label={`上移 ${chapter.name}`} disabled={index === 0} onClick={() => onReorder(chapter.id, "up")}><ChevronUp size={13}/></button>
          <button title="下移" aria-label={`下移 ${chapter.name}`} disabled={index === chapters.length - 1} onClick={() => onReorder(chapter.id, "down")}><ChevronDown size={13}/></button>
          <button title="删除章节" aria-label={`删除 ${chapter.name}`} disabled={chapter.id === project.defaultChapterId} onClick={() => onDelete(chapter.id)}><Trash2 size={13}/></button>
        </div>
      </div>;
    })}</div>
  </div>;
}
