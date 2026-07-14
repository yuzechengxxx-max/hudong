import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { IconButton, SegmentedControl } from "./ui";

it("names icon-only commands and exposes a tooltip", () => {
  render(<IconButton label="素材"><span>icon</span></IconButton>);
  expect(screen.getByRole("button", { name: "素材" })).toHaveAttribute("title", "素材");
});

it("marks the selected segment", () => {
  render(<SegmentedControl ariaLabel="主题" value="dark" options={[{ value: "dark", label: "深色" }, { value: "light", label: "浅色" }]} onChange={() => {}}/>);
  expect(screen.getByRole("button", { name: "深色" })).toHaveAttribute("aria-pressed", "true");
});
