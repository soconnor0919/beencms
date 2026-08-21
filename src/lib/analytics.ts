import "server-only";

import { createHmac } from "crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { env } from "~/env";
import { db } from "~/server/db";
import { analyticsEvent, analyticsSettings } from "~/server/db/schema";

type AnalyticsKind = "pageview" | "conversion" | "outbound_click";

function visitorHash(siteId: string, headers: Headers, now: Date) {
  const ip =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown";
  const userAgent = headers.get("user-agent") ?? "unknown";
  const day = now.toISOString().slice(0, 10);
  return createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(`${siteId}|${day}|${ip}|${userAgent}`)
    .digest("hex");
}

function deviceFromUserAgent(userAgent: string | null) {
  const value = userAgent?.toLowerCase() ?? "";
  if (/ipad|tablet|kindle|silk/.test(value)) return "tablet" as const;
  if (/mobi|android|iphone|ipod/.test(value)) return "mobile" as const;
  return value ? ("desktop" as const) : ("unknown" as const);
}

function privacyOptOut(headers: Headers) {
  return headers.get("dnt") === "1" || headers.get("sec-gpc") === "1";
}

export function normalizeAnalyticsPath(value: string) {
  const path = value.trim().slice(0, 2048);
  return path.startsWith("/") && !path.startsWith("//") ? path : "/";
}

export function normalizeReferrer(
  value: string | null | undefined,
  requestHost?: string | null,
) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return hostname === requestHost?.split(":")[0]?.toLowerCase()
      ? null
      : hostname.slice(0, 512);
  } catch {
    return null;
  }
}

export async function recordAnalyticsEvent(input: {
  siteId: string;
  headers: Headers;
  kind: AnalyticsKind;
  path: string;
  name?: string;
  referrer?: string | null;
}) {
  if (privacyOptOut(input.headers)) return { recorded: false as const };
  const settings = db
    .select()
    .from(analyticsSettings)
    .where(eq(analyticsSettings.siteId, input.siteId))
    .get();
  if (settings && !settings.enabled) return { recorded: false as const };

  const now = new Date();
  const hash = visitorHash(input.siteId, input.headers, now);
  const path = normalizeAnalyticsPath(input.path);
  if (input.kind === "pageview") {
    const recent = db
      .select({ id: analyticsEvent.id })
      .from(analyticsEvent)
      .where(
        and(
          eq(analyticsEvent.siteId, input.siteId),
          eq(analyticsEvent.kind, "pageview"),
          eq(analyticsEvent.path, path),
          eq(analyticsEvent.visitorHash, hash),
          gt(analyticsEvent.createdAt, new Date(now.getTime() - 10_000)),
        ),
      )
      .get();
    if (recent) return { recorded: false as const };
  }
  await db.insert(analyticsEvent).values({
    siteId: input.siteId,
    kind: input.kind,
    name: input.name?.slice(0, 128) || null,
    path,
    referrer: normalizeReferrer(
      input.referrer,
      input.headers.get("x-forwarded-host") ?? input.headers.get("host"),
    ),
    visitorHash: hash,
    device: deviceFromUserAgent(input.headers.get("user-agent")),
    createdAt: now,
  });

  const lastPrunedAt = settings?.lastPrunedAt;
  if (!lastPrunedAt || now.getTime() - lastPrunedAt.getTime() > 86_400_000) {
    const retentionDays = settings?.retentionDays ?? 90;
    await db
      .delete(analyticsEvent)
      .where(
        and(
          eq(analyticsEvent.siteId, input.siteId),
          lt(
            analyticsEvent.createdAt,
            new Date(now.getTime() - retentionDays * 86_400_000),
          ),
        ),
      );
    await db
      .insert(analyticsSettings)
      .values({ siteId: input.siteId, lastPrunedAt: now })
      .onConflictDoUpdate({
        target: analyticsSettings.siteId,
        set: { lastPrunedAt: now },
      });
  }
  return { recorded: true as const };
}
