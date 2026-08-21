import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import BlockRenderer from "~/components/BlockRenderer";
import type { Block } from "~/lib/blocks";
import { db } from "~/server/db";
import { dynamicPage, siteSettings } from "~/server/db/schema";
import { headers } from "next/headers";
import { draftMode } from "next/headers";
import { auth } from "~/server/auth";
import { resolveMemberSite, resolvePublicSiteId } from "~/lib/sites";

function routeParts(parts: string[]) {
  const localePrefix = parts[0]?.match(/^[a-z]{2}(?:-[A-Z]{2})?$/)
    ? parts[0]
    : null;
  return {
    locale: localePrefix ?? "en-US",
    slug: (localePrefix ? parts.slice(1) : parts).join("/"),
  };
}

async function getPage(parts: string[]) {
  const { locale, slug } = routeParts(parts);
  const requestHeaders = await headers();
  const previewEnabled = (await draftMode()).isEnabled;
  const session = previewEnabled
    ? await auth.api.getSession({ headers: requestHeaders })
    : null;
  const membership = session?.user
    ? await resolveMemberSite(requestHeaders, session.user.id)
    : null;
  const canPreview = Boolean(
    previewEnabled &&
    membership &&
    ["owner", "admin", "editor"].includes(membership.role),
  );
  const siteId = canPreview
    ? membership!.siteId
    : await resolvePublicSiteId(requestHeaders);
  const now = new Date();
  const visibility = canPreview
    ? undefined
    : or(
        eq(dynamicPage.status, "published"),
        and(
          eq(dynamicPage.status, "scheduled"),
          lte(dynamicPage.publishAt, now),
        ),
      );
  const page = db
    .select()
    .from(dynamicPage)
    .where(
      and(
        eq(dynamicPage.siteId, siteId),
        eq(dynamicPage.slug, slug),
        eq(dynamicPage.locale, locale),
        visibility,
        canPreview
          ? undefined
          : or(
              isNull(dynamicPage.unpublishAt),
              gt(dynamicPage.unpublishAt, now),
            ),
      ),
    )
    .get();
  return { page, canPreview };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { page } = await getPage((await params).slug);
  if (!page) return {};
  const settings = db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.siteId, page.siteId))
    .get();
  const title = page.seoTitle ?? `${page.title} | ${settings?.siteName ?? ""}`;
  return {
    title,
    description: page.seoDescription,
    alternates: page.canonical ? { canonical: page.canonical } : undefined,
    robots: page.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description: page.seoDescription ?? undefined,
      images: page.ogImage ? [page.ogImage] : undefined,
    },
  };
}

export default async function DynamicPublicPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { page, canPreview } = await getPage((await params).slug);
  if (!page) notFound();
  const layout = canPreview ? (page.draftLayout ?? page.layout) : page.layout;
  return (
    <BlockRenderer
      blocks={JSON.parse(layout) as Block[]}
      siteId={page.siteId}
    />
  );
}
