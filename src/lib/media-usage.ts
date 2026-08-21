import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { cmsSite, mediaAsset, mediaVariant } from "~/server/db/schema";

export async function getSiteMediaUsage(siteId: string) {
  const [site, assets, variants] = await Promise.all([
    db
      .select({ quotaBytes: cmsSite.storageQuotaBytes })
      .from(cmsSite)
      .where(eq(cmsSite.id, siteId))
      .get(),
    db
      .select({ id: mediaAsset.id, size: mediaAsset.size })
      .from(mediaAsset)
      .where(eq(mediaAsset.siteId, siteId)),
    db
      .select({ assetId: mediaVariant.assetId, size: mediaVariant.size })
      .from(mediaVariant)
      .where(eq(mediaVariant.siteId, siteId)),
  ]);
  const assetsWithVariants = new Set(variants.map((item) => item.assetId));
  const variantBytes = variants.reduce((sum, item) => sum + item.size, 0);
  const legacyBytes = assets.reduce(
    (sum, item) =>
      sum + (assetsWithVariants.has(item.id) ? 0 : Math.max(0, item.size)),
    0,
  );
  const usedBytes = variantBytes + legacyBytes;
  const quotaBytes = site?.quotaBytes ?? 1_073_741_824;
  return {
    usedBytes,
    quotaBytes,
    remainingBytes: Math.max(0, quotaBytes - usedBytes),
    assetCount: assets.length,
    variantCount: variants.length,
  };
}
