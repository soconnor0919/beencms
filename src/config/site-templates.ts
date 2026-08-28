import { getStarterBlocks } from "~/config/starters";
import {
  getCornerStyleForRadius,
  getLayoutPreset,
  getSiteTheme,
  type LayoutPresetId,
  type SiteThemeId,
} from "~/config/themes";
import type { Block } from "~/lib/blocks";

export type SiteTemplateSnapshot = {
  version: 1;
  settings: {
    themePreset: SiteThemeId;
    layoutPreset: LayoutPresetId;
    headerStyle: "standard" | "centered" | "minimal";
    footerStyle: "columns" | "centered" | "minimal";
    sectionSpacing: "compact" | "balanced" | "airy";
    buttonStyle: "square" | "rounded" | "pill";
    primaryColor: string;
    accentColor: string;
    textColor: string;
    bodyFont: string;
    headingFont: string;
    cornerStyle: "square" | "subtle" | "rounded" | "playful";
    contentAlignment: "left" | "center" | "right";
    navLinks: string;
    footerTagline: string | null;
  };
  layouts: Array<{ page: string; layout: Block[] }>;
  pages: Array<{
    title: string;
    slug: string;
    locale: string;
    layout: Block[];
    seoTitle?: string | null;
    seoDescription?: string | null;
    noIndex?: boolean;
  }>;
  reusable: Array<{
    name: string;
    category: string | null;
    content: Block[];
  }>;
};

export type BuiltInSiteTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
  snapshot: SiteTemplateSnapshot;
};

const contactLayout = (idPrefix: string): Block[] => [
  {
    id: `${idPrefix}-contact-intro`,
    type: "richtext",
    bg: "cream",
    heading: "Let’s work together",
    body: "<p>Share a little about your goals, timeline, and the best way to reach you.</p>",
  },
  {
    id: `${idPrefix}-contact-form`,
    type: "form",
    bg: "white",
    heading: "Start a conversation",
    buttonLabel: "Send inquiry",
  },
];

function builtIn(
  id: string,
  name: string,
  description: string,
  category: string,
  themeId: SiteThemeId,
  layoutId: LayoutPresetId,
): BuiltInSiteTemplate {
  const theme = getSiteTheme(themeId);
  const layout = getLayoutPreset(layoutId);
  return {
    id: `builtin:${id}`,
    name,
    description,
    category,
    snapshot: {
      version: 1,
      settings: {
        themePreset: theme.id,
        layoutPreset: layout.id,
        headerStyle: layout.headerStyle,
        footerStyle: layout.footerStyle,
        sectionSpacing: layout.sectionSpacing,
        buttonStyle: layout.buttonStyle,
        primaryColor: theme.primaryColor,
        accentColor: theme.accentColor,
        textColor: theme.textColor,
        bodyFont: theme.bodyFont,
        headingFont: theme.headingFont,
        cornerStyle: getCornerStyleForRadius(theme.radius),
        contentAlignment: layoutId === "editorial" ? "center" : "left",
        navLinks: JSON.stringify([
          { label: "Home", href: "/" },
          { label: "About", href: "/about" },
          { label: "Contact", href: "/contact" },
        ]),
        footerTagline: description,
      },
      layouts: [
        { page: "home", layout: getStarterBlocks(layoutId, name) },
        {
          page: "about",
          layout: [
            {
              id: `${id}-about`,
              type: "richtext",
              bg: "white",
              heading: "About",
              body: "<p>Tell the story behind the work, the values that guide it, and what makes your perspective distinctive.</p>",
            },
          ],
        },
        { page: "contact", layout: contactLayout(id) },
      ],
      pages: [],
      reusable: [],
    },
  };
}

export const BUILT_IN_SITE_TEMPLATES: readonly BuiltInSiteTemplate[] = [
  builtIn(
    "business",
    "Essential Business",
    "A polished service-business site with clear navigation and conversion paths.",
    "business",
    "foundation",
    "classic",
  ),
  builtIn(
    "editorial",
    "Independent Journal",
    "A reading-first publication for reporting, essays, and thought leadership.",
    "editorial",
    "editorial",
    "editorial",
  ),
  builtIn(
    "photography",
    "Photography Studio",
    "An image-led portfolio with a masonry gallery and inquiry flow.",
    "photography",
    "noir",
    "photography",
  ),
  builtIn(
    "technical",
    "Technical Portfolio",
    "A precise portfolio for systems, products, research, and engineering outcomes.",
    "portfolio",
    "signal",
    "technical",
  ),
  builtIn(
    "projects",
    "Project Case Studies",
    "A flexible agency and consulting portfolio organized around projects and results.",
    "portfolio",
    "studio",
    "projects",
  ),
];

export function getBuiltInSiteTemplate(id: string) {
  return BUILT_IN_SITE_TEMPLATES.find((template) => template.id === id);
}
