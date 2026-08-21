import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { processImage, variantStorageKey } from "~/lib/image-processing";

describe("image processing", () => {
  it("creates responsive WebP and AVIF variants without enlargement", async () => {
    const input = await sharp({
      create: {
        width: 120,
        height: 80,
        channels: 3,
        background: { r: 30, g: 90, b: 160 },
      },
    })
      .png()
      .toBuffer();
    const result = await processImage(input, "image/png");
    expect(result.defaultKind).toBe("large");
    expect(result.variants.map((item) => item.kind)).toEqual([
      "thumbnail",
      "small",
      "medium",
      "large",
      "original",
      "avif",
    ]);
    expect(result.variants.every((item) => (item.width ?? 0) <= 320)).toBe(
      true,
    );
    expect(result.dominantColor).toMatch(/^#[0-9a-f]{6}$/);
    expect(result.blurDataUrl).toMatch(/^data:image\/webp;base64,/);
  });

  it("uses tenant-contained immutable variant keys", () => {
    expect(
      variantStorageKey("site-one", "asset-token", {
        kind: "medium",
        extension: ".webp",
      }),
    ).toBe("uploads/site-one/asset-token/medium.webp");
  });
});
