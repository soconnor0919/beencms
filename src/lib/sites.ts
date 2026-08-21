import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "~/server/db";
import { cmsSite, siteMembership } from "~/server/db/schema";

export const ACTIVE_SITE_COOKIE = "hadlockcms_site";
export const DEFAULT_SITE_ID = "default";

function cookieValue(headers: Headers, name: string): string | null {
  const value = headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
  return value ? decodeURIComponent(value) : null;
}

export function activeSitePreference(headers: Headers): string | null {
  return cookieValue(headers, ACTIVE_SITE_COOKIE);
}

function requestHostname(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  return (
    (forwarded ?? headers.get("host"))?.split(":")[0]?.toLowerCase() ?? null
  );
}

export async function resolvePublicSiteId(headers: Headers): Promise<string> {
  const hostname = requestHostname(headers);
  if (hostname) {
    const site = await db
      .select({ id: cmsSite.id })
      .from(cmsSite)
      .where(
        and(
          eq(cmsSite.hostname, hostname),
          eq(cmsSite.domainStatus, "verified"),
          eq(cmsSite.status, "active"),
        ),
      )
      .get();
    if (site) return site.id;
  }
  const preferred = cookieValue(headers, ACTIVE_SITE_COOKIE);
  if (preferred) {
    const site = await db
      .select({ id: cmsSite.id })
      .from(cmsSite)
      .where(and(eq(cmsSite.id, preferred), eq(cmsSite.status, "active")))
      .get();
    if (site) return site.id;
  }
  return DEFAULT_SITE_ID;
}

export async function resolveMemberSite(
  headers: Headers,
  userId: string,
): Promise<{
  siteId: string;
  role: "owner" | "admin" | "editor" | "reviewer" | "viewer";
} | null> {
  const requested = cookieValue(headers, ACTIVE_SITE_COOKIE) ?? DEFAULT_SITE_ID;
  const membership = await db
    .select({ siteId: siteMembership.siteId, role: siteMembership.role })
    .from(siteMembership)
    .where(
      and(
        eq(siteMembership.siteId, requested),
        eq(siteMembership.userId, userId),
      ),
    )
    .get();
  if (membership) return membership;
  return (
    db
      .select({ siteId: siteMembership.siteId, role: siteMembership.role })
      .from(siteMembership)
      .where(eq(siteMembership.userId, userId))
      .get() ?? null
  );
}

export async function resolveRequestSiteId(
  headers: Headers,
  userId?: string,
): Promise<string> {
  if (userId)
    return (
      (await resolveMemberSite(headers, userId))?.siteId ?? DEFAULT_SITE_ID
    );
  return resolvePublicSiteId(headers);
}
