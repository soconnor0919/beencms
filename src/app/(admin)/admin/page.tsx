import Link from "next/link";
import { headers } from "next/headers";
import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  Users, Briefcase, FileText, MessageSquare,
  UserCog, Settings, Clock, Activity,
} from "lucide-react";
import { PageHeader } from "~/components/admin/PageHeader";
import { PageContent } from "~/components/admin/PageContent";

function timeAgo(date: Date | number | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "number" ? new Date(date * 1000) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const ACTION_LABELS: Record<string, string> = {
  "content.save":      "Saved page content",
  "content.publish":   "Published page",
  "team.create":       "Added team member",
  "team.update":       "Updated team member",
  "team.delete":       "Removed team member",
  "company.create":    "Added program",
  "company.update":    "Updated program",
  "company.delete":    "Removed program",
  "settings.update":   "Updated site settings",
  "onboarding.complete": "Completed site setup",
  "users.invite":      "Invited user",
  "users.updateRole":  "Changed user role",
  "users.delete":      "Removed user",
};

const ACTION_ICON_MAP: Record<string, React.ElementType> = {
  "content.save":     FileText,
  "content.publish":  FileText,
  "team.create":      Users,
  "team.update":      Users,
  "team.delete":      Users,
  "company.create":   Briefcase,
  "company.update":   Briefcase,
  "company.delete":   Briefcase,
  "settings.update":  Settings,
  "onboarding.complete": Settings,
  "users.invite":     UserCog,
  "users.updateRole": UserCog,
  "users.delete":     UserCog,
};

export default async function AdminDashboard() {
  const ctx = await createTRPCContext({ headers: await headers() });
  const caller = createCaller(ctx);

  const [companies, teamData, messages, auditEntries] = await Promise.all([
    caller.companies.getAllForEditor(),
    caller.team.getAll(),
    caller.contact.getAll(),
    caller.audit.getRecent({ limit: 25 }).catch(() => [] as Awaited<ReturnType<typeof caller.audit.getRecent>>),
  ]);

  const unreadMessages = messages.filter((m) => !m.read).length;

  const stats = [
    {
      label: "Team Members",
      value: teamData.filter((m) => !m.isAffiliate).length,
      sub: `${teamData.filter((m) => m.isAffiliate).length} affiliates`,
      icon: Users,
      href: "/admin/team",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      badge: undefined as number | undefined,
    },
    {
      label: "Programs",
      value: companies.filter((c) => c.status === "active").length,
      sub: `${companies.filter((c) => c.status === "coming_soon").length} coming soon`,
      icon: Briefcase,
      href: "/admin/companies",
      color: "text-olive",
      bg: "bg-olive/10",
      badge: undefined as number | undefined,
    },
    {
      label: "Messages",
      value: messages.length,
      sub: unreadMessages > 0 ? `${unreadMessages} unread` : "All read",
      icon: MessageSquare,
      href: "/admin/messages",
      color: unreadMessages > 0 ? "text-amber-500" : "text-emerald-500",
      bg: unreadMessages > 0 ? "bg-amber-500/10" : "bg-emerald-500/10",
      badge: unreadMessages > 0 ? unreadMessages : undefined as number | undefined,
    },
    {
      label: "Audit Events",
      value: auditEntries.length,
      sub: "Last 25 actions",
      icon: Activity,
      href: "#audit",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      badge: undefined as number | undefined,
    },
  ];

  const quickLinks = [
    { title: "Page Content",  href: "/admin/content",  icon: FileText,      desc: "Edit pages & blocks",    badge: undefined as number | undefined },
    { title: "Users",         href: "/admin/users",    icon: UserCog,       desc: "Manage roles & access",  badge: undefined as number | undefined },
    { title: "Site Settings", href: "/admin/settings", icon: Settings,      desc: "Branding & white-label", badge: undefined as number | undefined },
    { title: "Messages",      href: "/admin/messages", icon: MessageSquare, desc: unreadMessages > 0 ? `${unreadMessages} unread` : "All read", badge: unreadMessages || undefined },
  ];

  return (
    <PageContent
      maxWidth="max-w-5xl"
      header={<PageHeader title="Dashboard" description="Welcome back. Here's what's happening." />}
    >

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <Link key={s.href} href={s.href} className="group">
              <Card className="h-full transition-all group-hover:border-primary/40 group-hover:shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className={`rounded-lg p-2.5 ${s.bg}`}>
                      <s.icon className={`h-5 w-5 ${s.color}`} />
                    </div>
                    {s.badge != null && (
                      <Badge variant="destructive" className="text-xs">{s.badge}</Badge>
                    )}
                  </div>
                  <div className="mt-4">
                    <div className="text-3xl font-bold text-foreground tabular-nums">{s.value}</div>
                    <div className="mt-1 text-sm font-medium text-foreground">{s.label}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{s.sub}</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Quick Links + Audit */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-1 space-y-0.5">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted group"
                >
                  <div className="rounded-md bg-muted p-2 group-hover:bg-background transition-colors shrink-0">
                    <link.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{link.title}</div>
                    <div className="text-xs text-muted-foreground">{link.desc}</div>
                  </div>
                  {link.badge != null && (
                    <Badge variant="destructive" className="text-xs">{link.badge}</Badge>
                  )}
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card id="audit">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              {auditEntries.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                <div className="space-y-0.5">
                  {auditEntries.map((entry) => {
                    const Icon = ACTION_ICON_MAP[entry.action] ?? Activity;
                    const label = ACTION_LABELS[entry.action] ?? entry.action;
                    return (
                      <div key={entry.id} className="flex items-start gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/50 transition-colors">
                        <div className="rounded-md bg-muted p-1.5 shrink-0 mt-0.5">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground leading-tight">{label}</p>
                          {entry.detail && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{entry.detail}</p>
                          )}
                          <p className="text-xs text-muted-foreground/60 mt-0.5">
                            {entry.userEmail ?? "Unknown"} · {timeAgo(entry.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Programs overview */}
        {companies.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Programs
                </CardTitle>
                <Link href="/admin/companies" className="text-xs text-primary hover:underline">
                  Manage →
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-1 space-y-2">
              {companies.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3"
                >
                  <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground">{c.name}</span>
                    {c.tagline && (
                      <span className="ml-2 text-xs text-muted-foreground truncate">{c.tagline}</span>
                    )}
                  </div>
                  <Badge
                    variant={c.status === "active" ? "default" : c.status === "coming_soon" ? "secondary" : "outline"}
                    className="text-xs shrink-0"
                  >
                    {c.status === "active" ? "Active" : c.status === "coming_soon" ? "Coming Soon" : "Archived"}
                  </Badge>
                  <Link href={`/admin/companies/${c.id}`} className="text-xs text-primary hover:underline shrink-0">
                    Edit page →
                  </Link>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
    </PageContent>
  );
}
