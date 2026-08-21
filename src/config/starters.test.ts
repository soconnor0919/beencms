import { describe, expect, it } from "vitest";
import { getStarterBlocks } from "~/config/starters";

describe("site onboarding starters", () => {
  it.each([
    "classic",
    "editorial",
    "photography",
    "technical",
    "projects",
  ] as const)("creates a usable %s home page", (layout) => {
    const blocks = getStarterBlocks(layout, "Example Site");
    expect(blocks[0]).toMatchObject({ type: "hero", title: "Example Site" });
    expect(blocks.length).toBeGreaterThanOrEqual(3);
  });

  it("starts portfolio sites with the requested gallery mode", () => {
    expect(
      getStarterBlocks("photography", "Photo").some(
        (block) => block.type === "gallery" && block.variant === "photography",
      ),
    ).toBe(true);
    expect(
      getStarterBlocks("technical", "Tech").some(
        (block) => block.type === "gallery" && block.variant === "technical",
      ),
    ).toBe(true);
  });
});
