import { describe, expect, it } from "vitest";
import { calculateLeftPanelResize } from "./panelResize";

describe("left panel resize", () => {
  it("tracks pointer distance from the initial panel size without compounding", () => {
    const start = { x: 500, y: 600, width: 330, height: 650 };
    expect(calculateLeftPanelResize(start, 480, 620, 900)).toEqual({ width: 350, height: 670 });
    expect(calculateLeftPanelResize(start, 460, 640, 900)).toEqual({ width: 370, height: 690 });
  });
});
