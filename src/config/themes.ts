export type SiteThemeId =
  | "trellis"
  | "editorial"
  | "studio"
  | "heritage"
  | "sunrise"
  | "noir"
  | "signal";
export type CornerStyleId = "square" | "subtle" | "rounded" | "playful";
export type ContentAlignment = "left" | "center" | "right";
export type LayoutPresetId =
  "classic" | "editorial" | "photography" | "technical" | "projects";
export type HeaderStyleId = "standard" | "centered" | "minimal";
export type FooterStyleId = "columns" | "centered" | "minimal";
export type SectionSpacingId = "compact" | "balanced" | "airy";
export type ButtonStyleId = "square" | "rounded" | "pill";

export const COLOR_PALETTES = [
  {
    id: "trellis",
    name: "Trellis",
    primaryColor: "#8a7d55",
    accentColor: "#f8f5ee",
    textColor: "#2c2826",
  },
  {
    id: "forest",
    name: "Forest",
    primaryColor: "#2d6a4f",
    accentColor: "#f0f5f0",
    textColor: "#1a2e24",
  },
  {
    id: "ocean",
    name: "Ocean",
    primaryColor: "#1e6091",
    accentColor: "#eaf4fb",
    textColor: "#0a1f2e",
  },
  {
    id: "rose",
    name: "Rose",
    primaryColor: "#be185d",
    accentColor: "#fdf2f8",
    textColor: "#3b0a1e",
  },
  {
    id: "indigo",
    name: "Indigo",
    primaryColor: "#5653d4",
    accentColor: "#f1f0ff",
    textColor: "#18172b",
  },
  {
    id: "sunset",
    name: "Sunset",
    primaryColor: "#bd4f2d",
    accentColor: "#fff3dc",
    textColor: "#352016",
  },
] as const;

export const CORNER_STYLES: ReadonlyArray<{
  id: CornerStyleId;
  name: string;
  radius: string;
}> = [
  { id: "square", name: "Square", radius: "0rem" },
  { id: "subtle", name: "Subtle", radius: "0.375rem" },
  { id: "rounded", name: "Rounded", radius: "0.75rem" },
  { id: "playful", name: "Playful", radius: "1.25rem" },
];

export const FONT_PAIRS = [
  {
    id: "classic",
    name: "Classic",
    headingFont: "Georgia",
    bodyFont: "Source Sans 3",
  },
  {
    id: "editorial",
    name: "Editorial",
    headingFont: "Playfair Display",
    bodyFont: "Source Sans 3",
  },
  { id: "modern", name: "Modern", headingFont: "Poppins", bodyFont: "DM Sans" },
  {
    id: "literary",
    name: "Literary",
    headingFont: "Libre Baskerville",
    bodyFont: "Lora",
  },
  {
    id: "friendly",
    name: "Friendly",
    headingFont: "DM Serif Display",
    bodyFont: "Nunito",
  },
] as const;

export type SiteTheme = {
  id: SiteThemeId;
  name: string;
  description: string;
  bestFor: string;
  primaryColor: string;
  accentColor: string;
  textColor: string;
  bodyFont: string;
  headingFont: string;
  radius: string;
  contentWidth: string;
};

export const SITE_THEMES: readonly SiteTheme[] = [
  {
    id: "trellis",
    name: "Foundation",
    description: "Calm, trustworthy, and mission-led.",
    bestFor: "Nonprofits and community organizations",
    primaryColor: "#8a7d55",
    accentColor: "#f8f5ee",
    textColor: "#2c2826",
    bodyFont: "Source Sans 3",
    headingFont: "Georgia",
    radius: "0.75rem",
    contentWidth: "72rem",
  },
  {
    id: "editorial",
    name: "Editorial",
    description: "Type-forward with a strong newsroom rhythm.",
    bestFor: "Publications, news, and thought leadership",
    primaryColor: "#8b1e3f",
    accentColor: "#f6f1e8",
    textColor: "#241e1c",
    bodyFont: "Source Sans 3",
    headingFont: "Playfair Display",
    radius: "0.2rem",
    contentWidth: "68rem",
  },
  {
    id: "studio",
    name: "Studio",
    description: "Bold, spacious, and product-focused.",
    bestFor: "Agencies, startups, and portfolios",
    primaryColor: "#5653d4",
    accentColor: "#f1f0ff",
    textColor: "#18172b",
    bodyFont: "DM Sans",
    headingFont: "Poppins",
    radius: "1.35rem",
    contentWidth: "80rem",
  },
  {
    id: "heritage",
    name: "Heritage",
    description: "Classic typography with restrained details.",
    bestFor: "Institutions, churches, and local businesses",
    primaryColor: "#31543f",
    accentColor: "#f3efe3",
    textColor: "#29251f",
    bodyFont: "Lora",
    headingFont: "Libre Baskerville",
    radius: "0rem",
    contentWidth: "70rem",
  },
  {
    id: "sunrise",
    name: "Sunrise",
    description: "Warm, welcoming, and highly approachable.",
    bestFor: "Services, events, and family-focused brands",
    primaryColor: "#bd4f2d",
    accentColor: "#fff3dc",
    textColor: "#352016",
    bodyFont: "Nunito",
    headingFont: "DM Serif Display",
    radius: "1rem",
    contentWidth: "74rem",
  },
  {
    id: "noir",
    name: "Noir",
    description: "Cinematic contrast that keeps imagery in focus.",
    bestFor: "Photography, film, architecture, and art portfolios",
    primaryColor: "#9a6a2f",
    accentColor: "#f1ede5",
    textColor: "#171717",
    bodyFont: "DM Sans",
    headingFont: "Playfair Display",
    radius: "0rem",
    contentWidth: "88rem",
  },
  {
    id: "signal",
    name: "Signal",
    description: "Precise, contemporary, and engineered for clarity.",
    bestFor: "Technical portfolios, product teams, and consultancies",
    primaryColor: "#2563eb",
    accentColor: "#eff6ff",
    textColor: "#111827",
    bodyFont: "Inter",
    headingFont: "Poppins",
    radius: "0.375rem",
    contentWidth: "78rem",
  },
] as const;

export type LayoutPreset = {
  id: LayoutPresetId;
  name: string;
  description: string;
  bestFor: string;
  recommendedTheme: SiteThemeId;
  headerStyle: HeaderStyleId;
  footerStyle: FooterStyleId;
  sectionSpacing: SectionSpacingId;
  buttonStyle: ButtonStyleId;
  contentWidth: string;
  preview: "classic" | "magazine" | "masonry" | "terminal" | "case-study";
};

export const LAYOUT_PRESETS: readonly LayoutPreset[] = [
  {
    id: "classic",
    name: "Classic business",
    description: "A familiar navigation, broad hero, and structured footer.",
    bestFor: "Organizations, services, and local businesses",
    recommendedTheme: "trellis",
    headerStyle: "standard",
    footerStyle: "columns",
    sectionSpacing: "balanced",
    buttonStyle: "rounded",
    contentWidth: "72rem",
    preview: "classic",
  },
  {
    id: "editorial",
    name: "Editorial journal",
    description: "Centered masthead with a restrained, reading-first rhythm.",
    bestFor: "Publications, writers, and thought leadership",
    recommendedTheme: "editorial",
    headerStyle: "centered",
    footerStyle: "minimal",
    sectionSpacing: "airy",
    buttonStyle: "square",
    contentWidth: "68rem",
    preview: "magazine",
  },
  {
    id: "photography",
    name: "Photography gallery",
    description: "An image-led canvas with minimal chrome and generous scale.",
    bestFor: "Photographers, filmmakers, artists, and studios",
    recommendedTheme: "noir",
    headerStyle: "minimal",
    footerStyle: "minimal",
    sectionSpacing: "compact",
    buttonStyle: "square",
    contentWidth: "92rem",
    preview: "masonry",
  },
  {
    id: "technical",
    name: "Technical portfolio",
    description:
      "Dense, precise presentation for systems, tools, and outcomes.",
    bestFor: "Engineers, developers, researchers, and product teams",
    recommendedTheme: "signal",
    headerStyle: "standard",
    footerStyle: "columns",
    sectionSpacing: "balanced",
    buttonStyle: "rounded",
    contentWidth: "78rem",
    preview: "terminal",
  },
  {
    id: "projects",
    name: "Project portfolio",
    description:
      "A flexible case-study grid with room for process and results.",
    bestFor: "Designers, agencies, architects, and consultants",
    recommendedTheme: "studio",
    headerStyle: "minimal",
    footerStyle: "centered",
    sectionSpacing: "airy",
    buttonStyle: "pill",
    contentWidth: "84rem",
    preview: "case-study",
  },
] as const;

export const DEFAULT_SITE_THEME: SiteTheme = SITE_THEMES[0]!;

export function getSiteTheme(value: string | null | undefined): SiteTheme {
  return SITE_THEMES.find((theme) => theme.id === value) ?? DEFAULT_SITE_THEME;
}

export function getLayoutPreset(
  value: string | null | undefined,
): LayoutPreset {
  return (
    LAYOUT_PRESETS.find((layout) => layout.id === value) ?? LAYOUT_PRESETS[0]!
  );
}

export function getSectionSpacing(value: SectionSpacingId): string {
  return { compact: "3.5rem", balanced: "5rem", airy: "7rem" }[value];
}

export function getButtonRadius(value: ButtonStyleId): string {
  return { square: "0rem", rounded: "0.5rem", pill: "9999px" }[value];
}

export function getCornerRadius(value: string | null | undefined): string {
  return (
    CORNER_STYLES.find((style) => style.id === value)?.radius ??
    CORNER_STYLES[2]!.radius
  );
}

export function getCornerStyleForRadius(radius: string): CornerStyleId {
  return (
    CORNER_STYLES.find((style) => style.radius === radius)?.id ?? "rounded"
  );
}
