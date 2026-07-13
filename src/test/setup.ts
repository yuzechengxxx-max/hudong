import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

class ResizeObserverMock {
  private callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element) {
    this.callback([{
      target,
      contentRect: target.getBoundingClientRect(),
      borderBoxSize: [],
      contentBoxSize: [],
      devicePixelContentBoxSize: [],
    }], this as unknown as ResizeObserver);
  }

  unobserve() {}
  disconnect() {}
}
Object.defineProperty(globalThis, "ResizeObserver", { value: ResizeObserverMock });
class DOMMatrixReadOnlyMock { m22 = 1; }
Object.defineProperty(window, "DOMMatrixReadOnly", { value: DOMMatrixReadOnlyMock });
Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, value: 1000 });
Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, value: 700 });
HTMLElement.prototype.getBoundingClientRect = function () {
  return {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 1000,
    bottom: 700,
    width: 1000,
    height: 700,
    toJSON: () => ({}),
  };
};

afterEach(() => { cleanup(); localStorage.clear(); });
