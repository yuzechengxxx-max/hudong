import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

export function IconButton({ label, active, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return <button {...props} aria-label={props["aria-label"] ?? label} title={label} data-active={active || undefined} className={`ui-icon-button ${className}`}/>;
}

export function SegmentedControl<T extends string>({ ariaLabel, value, options, onChange, className = "" }: { ariaLabel: string; value: T; options: { value: T; label: string }[]; onChange(value: T): void; className?: string }) {
  return <div className={`segmented-control ${className}`} role="group" aria-label={ariaLabel}>{options.map(option => <button type="button" key={option.value} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}</button>)}</div>;
}

export function GlassPanel({ className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return <section {...props} className={`glass-panel ${className}`}/>;
}

export function PanelHeader({ title, meta, actions }: { title: ReactNode; meta?: ReactNode; actions?: ReactNode }) {
  return <header className="panel-header"><b>{title}</b>{meta && <span>{meta}</span>}<div className="panel-header-actions">{actions}</div></header>;
}

export function StatusBadge({ tone = "neutral", className = "", ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "success" | "warning" | "danger" }) {
  return <span {...props} data-tone={tone} className={`status-badge ${className}`}/>;
}
