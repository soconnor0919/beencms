import { describe, expect, it } from "vitest";
import {
  commitEditorHistory,
  createEditorHistory,
  redoEditorHistory,
  undoEditorHistory,
} from "~/lib/editor-history";
import {
  defaultBlock,
  duplicateBlock,
  validateBlockLayout,
} from "~/lib/blocks";

describe("visual editor history", () => {
  it("supports bounded undo and redo without mutating snapshots", () => {
    let history = createEditorHistory(["one"]);
    history = commitEditorHistory(history, ["two"], 2);
    history = commitEditorHistory(history, ["three"], 2);
    history = commitEditorHistory(history, ["four"], 2);
    expect(history.past).toEqual([["two"], ["three"]]);
    history = undoEditorHistory(history);
    expect(history.present).toEqual(["three"]);
    history = redoEditorHistory(history);
    expect(history.present).toEqual(["four"]);
  });

  it("duplicates blocks with collision-free nested gallery IDs", () => {
    const gallery = defaultBlock("gallery", "gallery-original");
    if (gallery.type !== "gallery") throw new Error("Expected a gallery");
    let id = 0;
    const copy = duplicateBlock(gallery, () => `copy-${++id}`);
    expect(copy.id).toBe("copy-1");
    if (copy.type !== "gallery") throw new Error("Expected a gallery");
    expect(copy.items.every((item) => item.id !== gallery.items[0]?.id)).toBe(
      true,
    );
  });

  it("rejects malformed and duplicate block layouts", () => {
    expect(() =>
      validateBlockLayout([
        { id: "same", type: "hero", bg: "white" },
        { id: "same", type: "hero", bg: "white" },
      ]),
    ).toThrow(/unique/i);
    expect(() =>
      validateBlockLayout([{ id: "one", type: "script", bg: "white" }]),
    ).toThrow(/unsupported block type/i);
  });
});
