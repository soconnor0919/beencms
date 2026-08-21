import { describe, expect, it } from "vitest";
import { detectMediaType } from "~/lib/media";

describe("detectMediaType", () => {
  it("recognizes supported image signatures", () => {
    expect(detectMediaType(Uint8Array.from([0xff, 0xd8, 0xff, 0x00]))).toBe(
      "image/jpeg",
    );
    expect(
      detectMediaType(
        Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe("image/png");
    expect(detectMediaType(Buffer.from("GIF89a"))).toBe("image/gif");
    expect(detectMediaType(Buffer.from("RIFFxxxxWEBP"))).toBe("image/webp");
  });

  it("rejects unknown or spoofed content", () => {
    expect(
      detectMediaType(Buffer.from("<svg><script>alert(1)</script></svg>")),
    ).toBeNull();
  });
});
