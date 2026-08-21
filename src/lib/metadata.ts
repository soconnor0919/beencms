import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { db } from "~/server/db";
import { pageSeo, siteSettings } from "~/server/db/schema";
import { appDefaults } from "~/config/cms";
import { headers } from "next/headers";
import { resolvePublicSiteId } from "~/lib/sites";

export async function getPageMetadata(
  page: string,
  path: string,
  fallbackTitle: string,
): Promise<Metadata> {
  const siteId = await resolvePublicSiteId(await headers());
  const seo = db
    .select()
    .from(pageSeo)
    .where(and(eq(pageSeo.siteId, siteId), eq(pageSeo.page, page)))
    .get();
  const settings = db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.siteId, siteId))
    .get();
  const base = settings?.siteUrl ? new URL(settings.siteUrl) : undefined;
  const title =
    seo?.title ??
    `${fallbackTitle} | ${settings?.siteName ?? appDefaults.name}`;
  const description =
    seo?.description ?? settings?.seoDescription ?? appDefaults.description;
  const canonical =
    seo?.canonical ?? (base ? new URL(path, base).toString() : undefined);
  return {
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    robots: seo?.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      url: canonical,
      images: seo?.ogImage ? [seo.ogImage] : undefined,
    },
  };
}
