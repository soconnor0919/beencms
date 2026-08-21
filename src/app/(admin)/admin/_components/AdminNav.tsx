"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "~/lib/utils";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  MessageSquare,
  Settings,
  UserCog,
  BookOpen,
  Images,
  Search,
  CalendarDays,
  Files,
  Library,
  ListChecks,
  Webhook,
  Activity,
  ShieldCheck,
  Paintbrush,
  Globe2,
  CircleUserRound,
  LayoutTemplate,
  Rocket,
  CreditCard,
  ChartNoAxesCombined,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { features } from "~/config/cms";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  group: "content" | "system";
}

const NAV: NavItem[] = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
    group: "content",
  },
  ...(features.team
    ? [
        {
          href: "/admin/team",
          label: "Team Members",
          icon: Users,
          group: "content" as const,
        },
      ]
    : []),
  ...(features.programs
    ? [
        {
          href: "/admin/companies",
          label: "Programs",
          icon: Briefcase,
          group: "content" as const,
        },
      ]
    : []),
  {
    href: "/admin/content",
    label: "Page Content",
    icon: FileText,
    group: "content",
  },
  { href: "/admin/pages", label: "Pages", icon: Files, group: "content" },
  ...(features.messages
    ? [
        {
          href: "/admin/messages",
          label: "Messages",
          icon: MessageSquare,
          group: "content" as const,
        },
      ]
    : []),
  ...(features.blog
    ? [
        {
          href: "/admin/posts",
          label: "News & Articles",
          icon: BookOpen,
          group: "content" as const,
        },
      ]
    : []),
  ...(features.calendar
    ? [
        {
          href: "/admin/calendar",
          label: "Calendar",
          icon: CalendarDays,
          group: "content" as const,
        },
      ]
    : []),
  { href: "/admin/media", label: "Media", icon: Images, group: "content" },
  { href: "/admin/library", label: "Library", icon: Library, group: "content" },
  {
    href: "/admin/templates",
    label: "Site Templates",
    icon: LayoutTemplate,
    group: "content",
  },
  {
    href: "/admin/publishing",
    label: "Publishing",
    icon: Rocket,
    group: "content",
  },
  { href: "/admin/forms", label: "Forms", icon: ListChecks, group: "content" },
  {
    href: "/admin/design",
    label: "Design Studio",
    icon: Paintbrush,
    group: "system",
  },
  { href: "/admin/sites", label: "Sites", icon: Globe2, group: "system" },
  {
    href: "/admin/billing",
    label: "Billing & Plans",
    icon: CreditCard,
    group: "system",
  },
  {
    href: "/admin/profile",
    label: "Your Profile",
    icon: CircleUserRound,
    group: "system",
  },
  { href: "/admin/seo", label: "SEO", icon: Search, group: "system" },
  {
    href: "/admin/analytics",
    label: "Analytics",
    icon: ChartNoAxesCombined,
    group: "system",
  },
  { href: "/admin/users", label: "Users", icon: UserCog, group: "system" },
  {
    href: "/admin/account",
    label: "Account Security",
    icon: ShieldCheck,
    group: "system",
  },
  {
    href: "/admin/integrations",
    label: "Integrations",
    icon: Webhook,
    group: "system",
  },
  {
    href: "/admin/operations",
    label: "Operations",
    icon: Activity,
    group: "system",
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: Settings,
    group: "system",
  },
];

interface AdminNavProps {
  collapsed?: boolean;
}

export default function AdminNav({ collapsed = false }: AdminNavProps) {
  const pathname = usePathname();

  const linkClass = (active: boolean) =>
    cn(
      "flex items-center rounded-md py-2 text-sm transition-colors",
      collapsed ? "justify-center px-2" : "gap-2.5 px-3",
      active
        ? "bg-primary/10 text-primary font-medium"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  const renderItem = (item: NavItem) => {
    const active = item.exact
      ? pathname === item.href
      : pathname.startsWith(item.href);

    if (collapsed) {
      return (
        <Tooltip key={item.href}>
          <TooltipTrigger asChild>
            <Link href={item.href} className={linkClass(active)}>
              <item.icon className="h-4 w-4 shrink-0" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Link key={item.href} href={item.href} className={linkClass(active)}>
        <item.icon className="h-4 w-4 shrink-0" />
        {item.label}
      </Link>
    );
  };

  const contentItems = NAV.filter((i) => i.group === "content");
  const systemItems = NAV.filter((i) => i.group === "system");

  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-0.5">
        {contentItems.map(renderItem)}

        {/* Section divider */}
        <div className={cn("pt-3 pb-1", collapsed ? "px-1" : "px-1")}>
          <div className="border-t" />
        </div>

        {systemItems.map(renderItem)}
      </div>
    </TooltipProvider>
  );
}
