import sharp from "sharp";
import type { SupportedImageType } from "~/lib/media";

export type ImageVariantKind =
  "thumbnail" | "small" | "medium" | "large" | "avif" | "original";

export type ProcessedImageVariant = {
  kind: ImageVariantKind;
  extension: ".webp" | ".avif" | ".gif";
  mimeType: "image/webp" | "image/avif" | "image/gif";
  buffer: Buffer;
  width?: number;
  height?: number;
};

export type ProcessedImage = {
  variants: ProcessedImageVariant[];
  defaultKind: ImageVariantKind;
  width?: number;
  height?: number;
  dominantColor: string | null;
  blurDataUrl: string | null;
  animated: boolean;
};

const inputOptions = {
  failOn: "error" as const,
  limitInputPixels: 100_000_000,
};

function colorHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue]
    .map((value) => Math.round(value).toString(16).padStart(2, "0"))
    .join("")}`;
}

async function webpVariant(
  input: Buffer,
  kind: ImageVariantKind,
  width: number,
  quality: number,
  square = false,
): Promise<ProcessedImageVariant> {
  const pipeline = sharp(input, inputOptions)
    .rotate()
    .resize({
      width,
      height: square ? width : undefined,
      fit: square ? "cover" : "inside",
      position: "centre",
      withoutEnlargement: true,
    });
  const { data, info } = await pipeline
    .webp({ quality, effort: 4, smartSubsample: true })
    .toBuffer({ resolveWithObject: true });
  return {
    kind,
    extension: ".webp",
    mimeType: "image/webp",
    buffer: data,
    width: info.width,
    height: info.height,
  };
}

export async function processImage(
  input: Buffer,
  mimeType: SupportedImageType,
): Promise<ProcessedImage> {
  const metadata = await sharp(input, {
    ...inputOptions,
    animated: mimeType === "image/gif",
  }).metadata();
  const animated = mimeType === "image/gif" && (metadata.pages ?? 1) > 1;
  const [stats, blur] = await Promise.all([
    sharp(input, inputOptions).rotate().stats(),
    sharp(input, inputOptions)
      .rotate()
      .resize({ width: 24, height: 24, fit: "inside" })
      .blur(1)
      .webp({ quality: 35 })
      .toBuffer(),
  ]);
  const dominantColor = colorHex(
    stats.dominant.r,
    stats.dominant.g,
    stats.dominant.b,
  );
  const blurDataUrl = `data:image/webp;base64,${blur.toString("base64")}`;

  if (animated) {
    const [{ data, info }, thumbnail] = await Promise.all([
      sharp(input, { ...inputOptions, animated: true })
        .gif({ effort: 7 })
        .toBuffer({ resolveWithObject: true }),
      webpVariant(input, "thumbnail", 320, 76, true),
    ]);
    return {
      variants: [
        {
          kind: "original",
          extension: ".gif",
          mimeType: "image/gif",
          buffer: data,
          width: info.width,
          height: info.height,
        },
        thumbnail,
      ],
      defaultKind: "original",
      width: info.width,
      height: info.height,
      dominantColor,
      blurDataUrl,
      animated: true,
    };
  }

  const [thumbnail, small, medium, large, original, avif] = await Promise.all([
    webpVariant(input, "thumbnail", 320, 76, true),
    webpVariant(input, "small", 640, 80),
    webpVariant(input, "medium", 1280, 82),
    webpVariant(input, "large", 1920, 86),
    webpVariant(input, "original", 3840, 92),
    sharp(input, inputOptions)
      .rotate()
      .resize({ width: 1920, fit: "inside", withoutEnlargement: true })
      .avif({ quality: 58, effort: 4 })
      .toBuffer({ resolveWithObject: true })
      .then(({ data, info }) => ({
        kind: "avif" as const,
        extension: ".avif" as const,
        mimeType: "image/avif" as const,
        buffer: data,
        width: info.width,
        height: info.height,
      })),
  ]);
  return {
    variants: [thumbnail, small, medium, large, original, avif],
    defaultKind: "large",
    width: large.width,
    height: large.height,
    dominantColor,
    blurDataUrl,
    animated: false,
  };
}

export function variantStorageKey(
  siteId: string,
  assetToken: string,
  variant: Pick<ProcessedImageVariant, "kind" | "extension">,
) {
  return `uploads/${siteId}/${assetToken}/${variant.kind}${variant.extension}`;
}
