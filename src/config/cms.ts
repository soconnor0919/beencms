/**
 * cms.ts — compile-time configuration for this CMS instance.
 *
 * Platform-wide fallbacks used before a tenant completes onboarding. Tenant
 * identity and design live in site-scoped database records.
 */

// ── Engine identity — do not change in forks ──────────────────────────────────

export const cmsInfo = {
  /** The name of the CMS engine. Fork-invariant. */
  name: "hadlockCMS",
  /** Company responsible for the CMS engine. */
  company: "Hadlock Technologies",
  /** Semantic version of the engine. Bump on breaking schema/API changes. */
  version: "1.1.0",
};

// ── Content pages available in the Page Content editor ────────────────────────

export interface ContentPageDef {
  /** Unique key used to store the layout in the DB. */
  page: string;
  /** Human-readable label shown in the tab bar. */
  label: string;
  /** Public URL path — used for the preview iframe. */
  href: string;
}

export const contentPages: ContentPageDef[] = [
  { page: "home", label: "Home", href: "/" },
  { page: "about", label: "About", href: "/about" },
  { page: "donate", label: "Donate", href: "/donate" },
];

// ── Feature flags — disable entire sections for other tenants ─────────────────

export interface CmsFeatures {
  /** /admin/companies routes + Programs nav item. */
  programs: boolean;
  /** /admin/team route + Team Members nav item. */
  team: boolean;
  /** /admin/messages route + Messages nav item. */
  messages: boolean;
  /** /admin/posts routes + News & Articles nav item + public /blog pages. */
  blog: boolean;
  /** /admin/calendar + public /events and iCalendar feed. */
  calendar: boolean;
}

export const features: CmsFeatures = {
  programs: true,
  team: true,
  messages: true,
  blog: true,
  calendar: true,
};

// ── Default theme — overridden at runtime by site_settings.primaryColor etc. ──

export const defaultTheme = {
  /** Hex color used for buttons, links, and UI accents. */
  primaryColor: "#0076a0",
  /** Hex color used for cream/light section backgrounds. */
  accentColor: "#f4f1ea",
  /** Hex color used for default body text. */
  textColor: "#171716",
};

// ── App identity defaults — overridden at runtime by site_settings ─────────────

export const appDefaults = {
  name: "New Site",
  description: "A website created with hadlockCMS.",
};
