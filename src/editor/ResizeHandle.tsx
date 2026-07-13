import { useRef } from "react";

export function ResizeHandle({ orientation, onResize }: { orientation: "vertical" | "horizontal"; onResize(delta: number): void }) {
  const start = useRef(0);
  return <div role="separator" aria-orientation={orientation} className={`resize-handle ${orientation}`} onPointerDown={event => {
    start.current = orientation === "vertical" ? event.clientX : event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }} onPointerMove={event => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const current = orientation === "vertical" ? event.clientX : event.clientY;
    const delta = current - start.current;
    if (delta !== 0) { onResize(delta); start.current = current; }
  }}/>; 
}
