import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { cmsSite, siteMembership, siteSettings } from "~/server/db/schema";
import AdminShell from "./_components/AdminShell";
import { and, eq } from "drizzle-orm";
import { activeSitePreference, resolveMemberSite } from "~/lib/sites";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) redirect("/admin/login");
  const active = await resolveMemberSite(requestHeaders, session.user.id);
  if (!active) redirect("/admin/onboarding");
  if (activeSitePreference(requestHeaders) !== active.siteId)
    redirect(
      `/api/admin/site?siteId=${encodeURIComponent(active.siteId)}&next=/admin`,
    );

  const setup = await db
    .select({ onboardingComplete: siteSettings.onboardingComplete })
    .from(siteSettings)
    .where(eq(siteSettings.siteId, active.siteId))
    .get();
  if (!setup?.onboardingComplete) redirect("/admin/onboarding");
  const sites = await db
    .select({ id: cmsSite.id, name: cmsSite.name, role: siteMembership.role })
    .from(siteMembership)
    .innerJoin(cmsSite, eq(siteMembership.siteId, cmsSite.id))
    .where(
      and(
        eq(siteMembership.userId, session.user.id),
        eq(cmsSite.status, "active"),
      ),
    )
    .orderBy(cmsSite.name);

  return (
    <AdminShell
      userEmail={session.user.email}
      sites={sites}
      activeSiteId={active.siteId}
    >
      {children}
    </AdminShell>
  );
}
