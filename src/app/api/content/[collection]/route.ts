import { and, desc, eq, lte, or } from "drizzle-orm";
import { db } from "~/server/db";
import { companies, dynamicPage, post } from "~/server/db/schema";
import { resolvePublicSiteId } from "~/lib/sites";

export const revalidate = 60;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ collection: string }> },
) {
  const { collection } = await params;
  const siteId = await resolvePublicSiteId(request.headers);
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit") ?? 25), 1),
    100,
  );
  const headers = {
    "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
  };
  if (collection === "pages") {
    const locale = url.searchParams.get("locale") ?? "en-US";
    const visibility = or(
      eq(dynamicPage.status, "published"),
      and(
        eq(dynamicPage.status, "scheduled"),
        lte(dynamicPage.publishAt, new Date()),
      ),
    )!;
    const data = slug
      ? db
          .select()
          .from(dynamicPage)
          .where(
            and(
              eq(dynamicPage.siteId, siteId),
              eq(dynamicPage.slug, slug),
              eq(dynamicPage.locale, locale),
              visibility,
            ),
          )
          .get()
      : db
          .select()
          .from(dynamicPage)
          .where(
            and(
              eq(dynamicPage.siteId, siteId),
              eq(dynamicPage.locale, locale),
              visibility,
            ),
          )
          .limit(limit)
          .all();
    return Response.json({ data }, { headers });
  }
  if (collection === "posts") {
    const visibility = or(
      eq(post.status, "published"),
      and(eq(post.status, "scheduled"), lte(post.scheduledAt, new Date())),
    )!;
    const data = slug
      ? db
          .select()
          .from(post)
          .where(and(eq(post.siteId, siteId), eq(post.slug, slug), visibility))
          .get()
      : db
          .select()
          .from(post)
          .where(and(eq(post.siteId, siteId), visibility))
          .orderBy(desc(post.publishedAt))
          .limit(limit)
          .all();
    return Response.json({ data }, { headers });
  }
  if (collection === "programs") {
    const data = slug
      ? db
          .select()
          .from(companies)
          .where(
            and(
              eq(companies.siteId, siteId),
              eq(companies.slug, slug),
              eq(companies.status, "active"),
            ),
          )
          .get()
      : db
          .select()
          .from(companies)
          .where(
            and(eq(companies.siteId, siteId), eq(companies.status, "active")),
          )
          .limit(limit)
          .all();
    return Response.json({ data }, { headers });
  }
  return Response.json({ error: "Unknown collection" }, { status: 404 });
}
