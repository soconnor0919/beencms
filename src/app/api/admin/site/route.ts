import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { siteMembership } from "~/server/db/schema";
import { ACTIVE_SITE_COOKIE } from "~/lib/sites";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { siteId?: string } | null;
  if (!body?.siteId) return NextResponse.json({ error: "A site is required" }, { status: 400 });
  const membership = db.select({ siteId: siteMembership.siteId }).from(siteMembership).where(and(eq(siteMembership.siteId, body.siteId), eq(siteMembership.userId, session.user.id))).get();
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACTIVE_SITE_COOKIE, membership.siteId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return response;
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.redirect(new URL("/admin/login", request.url));
  const url = new URL(request.url);
  const siteId = url.searchParams.get("siteId");
  const next = url.searchParams.get("next")?.startsWith("/") ? url.searchParams.get("next")! : "/admin";
  if (!siteId) return NextResponse.json({ error: "A site is required" }, { status: 400 });
  const membership = db.select({ siteId: siteMembership.siteId }).from(siteMembership).where(and(eq(siteMembership.siteId, siteId), eq(siteMembership.userId, session.user.id))).get();
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const response = NextResponse.redirect(new URL(next, request.url));
  response.cookies.set(ACTIVE_SITE_COOKIE, membership.siteId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return response;
}
