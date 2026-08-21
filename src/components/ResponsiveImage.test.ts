import { describe, expect, it } from "vitest";
import { responsiveMediaSources } from "~/components/ResponsiveImage";

describe("responsive media sources", () => {
  it("derives immutable variants from processed hadlockCMS URLs", () => {
    const result = responsiveMediaSources(
      "https://cdn.example.com/uploads/site/asset/large.webp",
    );
    expect(result?.avif).toContain("/avif.avif");
    expect(result?.webp).toContain("small.webp 640w");
    expect(result?.webp).toContain("original.webp 3840w");
  });

  it("leaves legacy and third-party images untouched", () => {
    expect(responsiveMediaSources("https://images.example.com/photo.jpg")).toBe(
      null,
    );
  });
});
