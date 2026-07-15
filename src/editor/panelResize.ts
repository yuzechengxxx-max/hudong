export type PanelResizeStart = { x: number; y: number; width: number; height: number };

export function calculateLeftPanelResize(start: PanelResizeStart, clientX: number, clientY: number, viewportHeight: number) {
  return { width: Math.min(560, Math.max(280, start.width + start.x - clientX)), height: Math.min(viewportHeight - 130, Math.max(280, start.height + clientY - start.y)) };
}
