import { describe, expect, it } from "vitest";
import { defaultBlock } from "~/lib/blocks";

describe("gallery block", () => {
  it("creates an accessible photography-first gallery draft", () => {
    const block = defaultBlock("gallery", "gallery-1");
    expect(block).toMatchObject({
      id: "gallery-1",
      type: "gallery",
      variant: "photography",
      layout: "masonry",
      columns: 3,
      lightbox: true,
      items: [],
    });
  });
});
