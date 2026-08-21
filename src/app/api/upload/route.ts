import { createHash, randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { auditLog, mediaAsset, mediaVariant } from "~/server/db/schema";
import { processImage, variantStorageKey } from "~/lib/image-processing";
import {
  detectMediaType,
  fitsStorageQuota,
  normalizeMediaFolder,
} from "~/lib/media";
import { getSiteMediaUsage } from "~/lib/media-usage";
import { resolveMemberSite } from "~/lib/sites";
import { removeMedia, storeMedia } from "~/lib/storage";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);
const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const membership = await resolveMemberSite(request.headers, session.user.id);
  if (!membership || !["owner", "admin", "editor"].includes(membership.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type))
    return NextResponse.json(
      { error: "Use a JPEG, PNG, WebP, AVIF, or GIF image." },
      { status: 400 },
    );
  if (file.size > MAX_BYTES)
    return NextResponse.json(
      { error: "File too large (maximum 25 MB)." },
      { status: 413 },
    );

  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedType = detectMediaType(buffer);
  if (!detectedType || detectedType !== file.type)
    return NextResponse.json(
      { error: "File content does not match its declared image type." },
      { status: 400 },
    );
  const checksum = createHash("sha256").update(buffer).digest("hex");
  const duplicate = db
    .select()
    .from(mediaAsset)
    .where(
      and(
        eq(mediaAsset.siteId, membership.siteId),
        eq(mediaAsset.checksum, checksum),
      ),
    )
    .get();
  if (duplicate)
    return NextResponse.json({
      url: duplicate.url,
      asset: duplicate,
      deduplicated: true,
    });

  let processed;
  try {
    processed = await processImage(buffer, detectedType);
  } catch {
    return NextResponse.json(
      { error: "The image could not be decoded safely." },
      { status: 400 },
    );
  }
  const incomingBytes = processed.variants.reduce(
    (sum, variant) => sum + variant.buffer.byteLength,
    0,
  );
  const usage = await getSiteMediaUsage(membership.siteId);
  if (!fitsStorageQuota(usage.usedBytes, incomingBytes, usage.quotaBytes))
    return NextResponse.json(
      {
        error: "This upload would exceed the site storage quota.",
        usage,
        incomingBytes,
      },
      { status: 413 },
    );

  const assetToken = randomUUID();
  const stored: Array<{
    kind: (typeof processed.variants)[number]["kind"];
    url: string;
    storageKey: string;
    mimeType: string;
    size: number;
    width?: number;
    height?: number;
  }> = [];
  try {
    for (const variant of processed.variants) {
      const storageKey = variantStorageKey(
        membership.siteId,
        assetToken,
        variant,
      );
      const url = await storeMedia({
        key: storageKey,
        buffer: variant.buffer,
        contentType: variant.mimeType,
      });
      stored.push({
        kind: variant.kind,
        url,
        storageKey,
        mimeType: variant.mimeType,
        size: variant.buffer.byteLength,
        width: variant.width,
        height: variant.height,
      });
    }
    const preferred =
      stored.find((item) => item.kind === processed.defaultKind) ?? stored[0]!;
    const filename = file.name.replace(/[\0\r\n]/g, "").slice(0, 512);
    const asset = db.transaction((tx) => {
      const row = tx
        .insert(mediaAsset)
        .values({
          siteId: membership.siteId,
          url: preferred.url,
          storageKey: preferred.storageKey,
          filename: filename || "image",
          mimeType: detectedType,
          size: file.size,
          width: processed.width,
          height: processed.height,
          folder: normalizeMediaFolder(
            typeof formData.get("folder") === "string"
              ? String(formData.get("folder"))
              : "",
          ),
          checksum,
          dominantColor: processed.dominantColor,
          blurDataUrl: processed.blurDataUrl,
          status: "ready",
          uploadedBy: session.user.id,
        })
        .returning()
        .get();
      tx.insert(mediaVariant)
        .values(
          stored.map((variant) => ({
            siteId: membership.siteId,
            assetId: row.id,
            ...variant,
          })),
        )
        .run();
      tx.insert(auditLog)
        .values({
          siteId: membership.siteId,
          userId: session.user.id,
          userEmail: session.user.email,
          action: "media.upload",
          entity: `media:${row.id}`,
          detail: `${filename || "image"} · ${stored.length} files · ${incomingBytes} bytes`,
        })
        .run();
      return row;
    });
    return NextResponse.json({
      url: asset.url,
      asset,
      variants: stored,
      deduplicated: false,
    });
  } catch (error) {
    await Promise.allSettled(
      stored.map((item) => removeMedia(item.storageKey)),
    );
    console.error("Media upload failed", error);
    return NextResponse.json(
      { error: "The image could not be stored." },
      { status: 500 },
    );
  }
}
