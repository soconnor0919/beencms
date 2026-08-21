export type SupportedImageType =
  "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "image/avif";

export function detectMediaType(buffer: Uint8Array): SupportedImageType | null {
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
    return "image/jpeg";
  const header = Buffer.from(buffer);
  if (
    header
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  )
    return "image/png";
  if (["GIF87a", "GIF89a"].includes(header.subarray(0, 6).toString("ascii")))
    return "image/gif";
  if (
    header.subarray(0, 4).toString("ascii") === "RIFF" &&
    header.subarray(8, 12).toString("ascii") === "WEBP"
  )
    return "image/webp";
  if (
    header.subarray(4, 8).toString("ascii") === "ftyp" &&
    ["avif", "avis"].includes(header.subarray(8, 12).toString("ascii"))
  )
    return "image/avif";
  return null;
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** index;
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

export function fitsStorageQuota(
  usedBytes: number,
  incomingBytes: number,
  quotaBytes: number,
) {
  return (
    usedBytes >= 0 &&
    incomingBytes >= 0 &&
    quotaBytes > 0 &&
    usedBytes + incomingBytes <= quotaBytes
  );
}

export function normalizeMediaFolder(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .map((part) => part.replace(/[^a-zA-Z0-9 _-]/g, "").trim())
    .filter(Boolean)
    .join("/")
    .slice(0, 256);
}
