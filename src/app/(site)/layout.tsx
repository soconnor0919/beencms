import Link from "next/link";
import Logo from "~/components/Logo";
import { ThemeToggle } from "~/components/ThemeToggle";
import MobileNav from "~/components/MobileNav";
import { db } from "~/server/db";
import { siteSettings } from "~/server/db/schema";
import { appDefaults, features } from "~/config/cms";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { resolvePublicSiteId } from "~/lib/sites";
import AnalyticsTracker from "~/components/AnalyticsTracker";

type NavLink = { label: string; href: string };
type SocialLink = { platform: string; url: string };
const fallbackLinks: NavLink[] = [
  { label: "About", href: "/about" },
  ...(features.team ? [{ label: "Team", href: "/team" }] : []),
  ...(features.programs ? [{ label: "Programs", href: "/programs" }] : []),
  ...(features.blog ? [{ label: "News", href: "/blog" }] : []),
  ...(features.calendar ? [{ label: "Events", href: "/events" }] : []),
  ...(features.messages ? [{ label: "Contact", href: "/contact" }] : []),
  { label: "Search", href: "/search" },
  { label: "Donate", href: "/donate" },
];

function parseLinks<T>(value: string | null | undefined): T[] {
  try {
    return value ? (JSON.parse(value) as T[]) : [];
  } catch {
    return [];
  }
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const siteId = await resolvePublicSiteId(await headers());
  const settings = db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.siteId, siteId))
    .get();
  const configured = parseLinks<NavLink>(settings?.navLinks);
  const links = configured.length ? configured : fallbackLinks;
  const socials = parseLinks<SocialLink>(settings?.socialLinks);
  const name = settings?.siteName ?? appDefaults.name;
  const headerStyle = settings?.headerStyle ?? "standard";
  const footerStyle = settings?.footerStyle ?? "columns";
  const centeredHeader = headerStyle === "centered";
  const minimalHeader = headerStyle === "minimal";
  return (
    <div
      data-site-shell
      data-layout-preset={settings?.layoutPreset ?? "classic"}
      className="flex min-h-screen flex-col"
    >
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-md bg-background px-4 py-2 font-medium shadow-lg transition-transform focus:translate-y-0"
      >
        Skip to Content
      </a>
      <header
        data-site-header
        data-header-style={headerStyle}
        className={`${minimalHeader ? "relative" : "sticky top-0"} z-50 border-b bg-background/95 backdrop-blur`}
      >
        <div
          data-site-container
          className={`mx-auto flex items-center px-6 ${centeredHeader ? "flex-col gap-5 py-6" : minimalHeader ? "justify-between py-6" : "justify-between py-4"}`}
          style={{ maxWidth: "var(--site-content-width)" }}
        >
          <Link href="/">
            <Logo width={140} src={settings?.logoUrl} alt={name} />
          </Link>
          <nav
            data-site-nav
            className={`hidden items-center text-sm font-medium md:flex ${centeredHeader ? "gap-9" : "gap-7"}`}
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  link.href === "/donate"
                    ? "rounded-[var(--button-radius)] bg-primary px-5 py-2 text-primary-foreground"
                    : "transition-colors hover:text-primary"
                }
              >
                {link.label}
              </Link>
            ))}
            <ThemeToggle />
          </nav>
          <MobileNav links={links} />
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        data-site-content
        className="flex-1"
        style={{ textAlign: settings?.contentAlignment ?? "left" }}
      >
        {children}
      </main>
      <AnalyticsTracker />
      <footer
        data-site-footer
        data-footer-style={footerStyle}
        className="bg-charcoal text-white"
      >
        <div
          data-site-container
          className={`mx-auto grid gap-10 px-6 ${footerStyle === "columns" ? "py-12 md:grid-cols-3" : "justify-items-center py-10 text-center"}`}
          style={{ maxWidth: "var(--site-content-width)" }}
        >
          {footerStyle === "columns" ? (
            <div>
              <Logo width={120} src={settings?.logoUrl} alt={name} />
              <p className="mt-3 text-sm leading-relaxed text-gray-400">
                {settings?.footerTagline ?? appDefaults.description}
              </p>
            </div>
          ) : null}
          {footerStyle !== "minimal" ? (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                Navigate
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="hover:text-olive-light">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              Get in touch
            </h2>
            {settings?.contactEmail ? (
              <a
                className="mt-3 block text-sm hover:text-olive-light"
                href={`mailto:${settings.contactEmail}`}
              >
                {settings.contactEmail}
              </a>
            ) : null}
            {settings?.contactPhone ? (
              <a
                className="mt-2 block text-sm"
                href={`tel:${settings.contactPhone}`}
              >
                {settings.contactPhone}
              </a>
            ) : null}
            {settings?.address ? (
              <p className="mt-2 whitespace-pre-line text-sm text-gray-400">
                {settings.address}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-3">
              {socials.map((social) => (
                <a
                  key={social.platform}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:text-olive-light"
                >
                  {social.platform}
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 px-6 py-5 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} {name}.
        </div>
      </footer>
    </div>
  );
}
