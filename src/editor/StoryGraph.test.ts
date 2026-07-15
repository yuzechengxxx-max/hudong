import { describe, expect, it } from "vitest";
import { preserveAdditiveSelection } from "./StoryGraph";

describe("additive marquee visuals", () => {
  it("keeps the initial nodes selected while a Shift marquee is active", () => {
    const changes = [
      { type: "select" as const, id: "node-a", selected: false },
      { type: "select" as const, id: "node-b", selected: true },
    ];
    expect(preserveAdditiveSelection(changes, ["node-a"], true)).toEqual([
      { type: "select", id: "node-b", selected: true },
    ]);
  });

  it("keeps normal deselection when the marquee is not additive", () => {
    const changes = [{ type: "select" as const, id: "node-a", selected: false }];
    expect(preserveAdditiveSelection(changes, ["node-a"], false)).toEqual(changes);
  });
});
