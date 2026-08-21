import { describe, expect, it } from "vitest";
import { fitsStorageQuota } from "~/lib/media";

describe("media storage quota", () => {
  it("accepts an upload at the exact limit", () => {
    expect(fitsStorageQuota(750, 250, 1000)).toBe(true);
  });

  it("rejects over-limit and invalid accounting values", () => {
    expect(fitsStorageQuota(751, 250, 1000)).toBe(false);
    expect(fitsStorageQuota(-1, 10, 1000)).toBe(false);
    expect(fitsStorageQuota(0, -1, 1000)).toBe(false);
  });
});
