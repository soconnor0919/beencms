import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import type { Metadata } from "next";
import { cmsInfo } from "~/config/cms";
import { resolveMemberSite } from "~/lib/sites";
import { db } from "~/server/db";
import {
  cmsSite,
  siteMembership,
  siteSettings,
  userProfile,
} from "~/server/db/schema";
import { eq } from "drizzle-orm";

export const metadata: Metadata = {
  title: `Site setup | ${cmsInfo.name}`,
  icons: { icon: "/branding/hadlock/icon-blue.svg" },
  robots: { index: false, follow: false },
};

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) redirect("/admin/login");

  let membership = await resolveMemberSite(requestHeaders, session.user.id);
  if (!membership) {
    const profile = db
      .select({ role: userProfile.role })
      .from(userProfile)
      .where(eq(userProfile.userId, session.user.id))
      .get();
    if (profile?.role !== "admin") redirect("/admin");
    await db
      .insert(cmsSite)
      .values({ id: "default", name: "New Site", slug: "default" })
      .onConflictDoNothing();
    await db
      .insert(siteMembership)
      .values({ siteId: "default", userId: session.user.id, role: "owner" })
      .onConflictDoNothing();
    await db
      .insert(siteSettings)
      .values({ siteId: "default", siteName: "New Site" })
      .onConflictDoNothing();
    membership = { siteId: "default", role: "owner" };
  }
  if (!["owner", "admin"].includes(membership.role)) redirect("/admin");

  return <div data-platform-shell>{children}</div>;
}
