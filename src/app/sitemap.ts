import type { MetadataRoute } from "next";
import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import { db } from "~/server/db";
import { companies, dynamicPage, post, siteSettings } from "~/server/db/schema";
import { headers } from "next/headers";
import { resolvePublicSiteId } from "~/lib/sites";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const siteId = await resolvePublicSiteId(await headers());
  const [settings, programs, posts, pages] = await Promise.all([
    db.select().from(siteSettings).where(eq(siteSettings.siteId, siteId)).get(),
    db
      .select()
      .from(companies)
      .where(and(eq(companies.siteId, siteId), eq(companies.status, "active"))),
    db
      .select()
      .from(post)
      .where(
        and(
          eq(post.siteId, siteId),
          or(
            eq(post.status, "published"),
            and(eq(post.status, "scheduled"), lte(post.scheduledAt, now)),
          ),
        ),
      ),
    db
      .select()
      .from(dynamicPage)
      .where(
        and(
          eq(dynamicPage.siteId, siteId),
          or(
            eq(dynamicPage.status, "published"),
            and(
              eq(dynamicPage.status, "scheduled"),
              lte(dynamicPage.publishAt, now),
            ),
          ),
          or(isNull(dynamicPage.unpublishAt), gt(dynamicPage.unpublishAt, now)),
        ),
      ),
  ]);
  const base = (
    settings?.siteUrl ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
  const paths = [
    "",
    "/about",
    "/team",
    "/programs",
    "/blog",
    "/events",
    "/donate",
    "/contact",
  ];
  return [
    ...paths.map((path) => ({
      url: `${base}${path}`,
      lastModified: new Date(),
    })),
    ...programs.map((item) => ({
      url: `${base}/programs/${item.slug}`,
      lastModified: item.updatedAt ?? new Date(),
    })),
    ...posts.map((item) => ({
      url: `${base}/blog/${item.slug}`,
      lastModified: item.updatedAt ?? new Date(),
    })),
    ...pages.map((item) => ({
      url: `${base}/${item.locale === "en-US" ? "" : `${item.locale}/`}${item.slug}`,
      lastModified: item.updatedAt ?? new Date(),
    })),
  ];
}
