import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Search } from "lucide-react";
import { nodeDefinitions, type NodeCategory } from "../core/nodeRegistry";
import type { NodeKind } from "../core/project";

type CreatableNodeKind = Exclude<NodeKind, "start">;

interface NodeCreateMenuProps {
  position: { x: number; y: number };
  graphPosition: { x: number; y: number };
  onCreate(kind: CreatableNodeKind, x: number, y: number): void;
  onClose(): void;
}

const categories: Array<{ id: NodeCategory; label: string }> = [
  { id: "content", label: "内容" },
  { id: "interaction", label: "互动" },
  { id: "logic", label: "逻辑" },
  { id: "performance", label: "演出" },
  { id: "structure", label: "结构" },
  { id: "ending", label: "结束" },
];

const creatableDefinitions = nodeDefinitions.filter((definition): definition is typeof definition & { kind: CreatableNodeKind } => definition.kind !== "start");

export function NodeCreateMenu({ position, graphPosition, onCreate, onClose }: NodeCreateMenuProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return creatableDefinitions;
    return creatableDefinitions.filter(definition => [definition.label, definition.description, ...definition.searchTerms].some(value => value.toLocaleLowerCase().includes(needle)));
  }, [query]);

  useEffect(() => { searchRef.current?.focus(); }, []);
  useEffect(() => { setActiveIndex(0); }, [query]);

  const create = (kind: CreatableNodeKind) => {
    onCreate(kind, graphPosition.x, graphPosition.y);
    onClose();
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
    if (!filtered.length) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex(index => (index + 1) % filtered.length); return; }
    if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex(index => (index - 1 + filtered.length) % filtered.length); return; }
    if (event.key === "Enter") { event.preventDefault(); create(filtered[activeIndex]?.kind ?? filtered[0].kind); }
  };

  return <div
    className="node-create-menu node-create-menu-v2 nodrag nopan nowheel"
    style={{ left: position.x, top: position.y }}
    onKeyDown={handleKeyDown}
    onPointerDown={event => event.stopPropagation()}
    onWheel={event => event.stopPropagation()}
  >
    <label className="node-menu-search"><Search size={14}/><input ref={searchRef} type="search" aria-label="搜索节点" placeholder="搜索节点" value={query} onChange={event => setQuery(event.target.value)}/></label>
    <div className="node-menu-results">
      {categories.map(category => {
        const items = filtered.filter(definition => definition.category === category.id);
        if (!items.length) return null;
        return <section key={category.id}><h3>{category.label}</h3>{items.map(definition => {
          const index = filtered.indexOf(definition);
          return <button key={definition.kind} className={index === activeIndex ? "active" : ""} aria-label={definition.label} onMouseEnter={() => setActiveIndex(index)} onClick={() => create(definition.kind)}>
            <i style={{ background: definition.color }}/><span><b>{definition.label}</b><small>{definition.description}</small></span>
          </button>;
        })}</section>;
      })}
      {!filtered.length && <p className="node-menu-empty">没有匹配的节点</p>}
    </div>
  </div>;
}
