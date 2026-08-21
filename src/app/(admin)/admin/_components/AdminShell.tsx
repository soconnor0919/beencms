"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ExternalLink, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import AdminNav from "./AdminNav";
import { ThemeToggle } from "~/components/ThemeToggle";
import { Separator } from "~/components/ui/separator";
import { CmsBrand } from "~/components/CmsBrand";
import { signOut } from "~/lib/auth-client";
import { cn } from "~/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { SiteSwitcher } from "./SiteSwitcher";

interface AdminShellProps {
  children: React.ReactNode;
  userEmail: string;
  sites: Array<{ id: string; name: string; role: string }>;
  activeSiteId: string;
}

export default function AdminShell({
  children,
  userEmail,
  sites,
  activeSiteId,
}: AdminShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("admin-sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      localStorage.setItem("admin-sidebar-collapsed", String(!c));
      return !c;
    });
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/admin/login");
  };

  const initial = userEmail.charAt(0).toUpperCase();

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-screen overflow-hidden bg-muted/30">
        <a
          href="#admin-main-content"
          className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-md bg-background px-4 py-2 font-medium shadow-lg transition-transform focus:translate-y-0"
        >
          Skip to Content
        </a>
        {/* ── Sidebar ── */}
        <aside
          className={cn(
            "relative shrink-0 border-r bg-card flex flex-col h-full transition-[width] duration-200",
            collapsed ? "w-14" : "w-56",
          )}
        >
          {/* Header: logo + collapse chevron */}
          <div
            className={cn(
              "flex items-center shrink-0 pt-5 pb-3",
              collapsed ? "justify-center px-0" : "px-4 justify-between",
            )}
          >
            <Link href="/" className="flex items-center shrink-0">
              {collapsed ? <CmsBrand compact /> : <CmsBrand showCompany />}
            </Link>

            {!collapsed && (
              <button
                onClick={toggle}
                aria-label="Collapse sidebar"
                className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
            )}
          </div>

          <Separator />

          {!collapsed ? (
            <div className="px-3 py-3">
              <SiteSwitcher sites={sites} activeSiteId={activeSiteId} />
            </div>
          ) : null}

          {!collapsed ? <Separator /> : null}

          {/* Nav — fills available space */}
          <nav className="flex-1 overflow-y-auto px-2 py-3">
            <AdminNav collapsed={collapsed} />
          </nav>

          {/* ── Footer: user info + theme toggle + actions ── */}
          <Separator />

          {collapsed ? (
            /* Collapsed footer: icon column */
            <div className="flex flex-col items-center py-3 px-1 gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="flex h-7 w-7 shrink-0 cursor-default items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-semibold"
                    aria-label={userEmail}
                  >
                    {initial}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">{userEmail}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="mt-0.5">
                    <ThemeToggle />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">Choose theme</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/"
                    target="_blank"
                    aria-label="View public site in a new tab"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <ExternalLink size={14} />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">View site</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleSignOut}
                    aria-label="Sign out"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
                  >
                    <LogOut size={14} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign out</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            /* Expanded footer */
            <div className="px-3 py-3 space-y-0.5">
              {/* User identity row */}
              <div className="flex items-center gap-2.5 px-1 py-1.5 mb-1">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-semibold select-none">
                  {initial}
                </div>
                <span className="flex-1 min-w-0 text-xs text-muted-foreground truncate">
                  {userEmail}
                </span>
                <ThemeToggle />
              </div>

              <Link
                href="/"
                target="_blank"
                className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <ExternalLink size={13} className="shrink-0" />
                View site
              </Link>

              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
              >
                <LogOut size={13} className="shrink-0" />
                Sign out
              </button>
            </div>
          )}

          {/* Clickable border strip — drag the edge to toggle */}
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="absolute inset-y-0 right-0 w-1 cursor-col-resize hover:bg-primary/25 transition-colors z-10"
          />

          {/* Floating expand button — only when collapsed, sits on the border */}
          {collapsed && (
            <button
              onClick={toggle}
              aria-label="Expand sidebar"
              className="absolute right-0 top-[52px] z-20 flex h-5 w-5 translate-x-[50%] items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground transition-colors"
            >
              <ChevronRight size={11} />
            </button>
          )}
        </aside>

        {/* Main content — scrolls independently */}
        <main
          id="admin-main-content"
          tabIndex={-1}
          className="flex-1 min-w-0 h-full overflow-hidden flex flex-col"
        >
          {children}
        </main>
      </div>
    </TooltipProvider>
  );
}
