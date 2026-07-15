import { History, RotateCcw } from "lucide-react";
import type { RecoveryPoint, RecoveryReason } from "./projectRepository";

const reasonLabels: Record<RecoveryReason, string> = {
  manual: "手动保存",
  interval: "自动恢复点",
  migration: "版本迁移",
  "pre-restore": "恢复前保护",
};

export function RecoveryPanel({ points, onRestore }: { points: RecoveryPoint[]; onRestore(id: string): void }) {
  return <section className="recovery-panel">
    <div className="recovery-heading"><span><History size={13}/>恢复点</span><small>最多保留 10 个</small></div>
    {points.length ? <div className="recovery-list">{points.map(point => <div className="recovery-row" key={point.id}>
      <div><b>{reasonLabels[point.reason]}</b><time dateTime={point.createdAt}>{new Date(point.createdAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</time><small>{point.chapterCount} 章 · {point.nodeCount} 节点</small></div>
      <button aria-label="恢复此版本" title="恢复此版本" onClick={() => onRestore(point.id)}><RotateCcw size={13}/></button>
    </div>)}</div> : <p className="panel-hint">保存项目后会在这里生成恢复点。</p>}
  </section>;
}
