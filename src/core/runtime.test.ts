import { describe, expect, it } from "vitest";
import { createStarterProject } from "./project";
import { createRuntime } from "./runtime";

describe("story runtime", () => {
  it("starts at the first visible scene", () => {
    const runtime = createRuntime(createStarterProject());
    expect(runtime.start()).toMatchObject({ currentNodeId: "opening", status: "playing" });
  });

  it("advances to a choice and follows the selected port", () => {
    const runtime = createRuntime(createStarterProject());
    runtime.start();
    expect(runtime.advance().status).toBe("awaiting-choice");
    expect(runtime.choose("warehouse")).toMatchObject({ currentNodeId: "ending", status: "ended" });
  });
});
