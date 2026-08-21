import type { MetadataRoute } from "next";
import { db } from "~/server/db";
import { siteSettings } from "~/server/db/schema";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { resolvePublicSiteId } from "~/lib/sites";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteId = await resolvePublicSiteId(await headers());
  const settings = db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.siteId, siteId))
    .get();
  const base = (
    settings?.siteUrl ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin/", "/api/"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
