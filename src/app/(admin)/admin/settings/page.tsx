"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Separator } from "~/components/ui/separator";
import { toast } from "sonner";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Check,
  Save,
  Plus,
  Trash2,
  Palette,
  Phone,
  Search,
  Image as ImageIcon,
  Link2,
  Globe,
  SwatchBook,
} from "lucide-react";
import ImageUpload from "~/components/admin/ImageUpload";
import { PageHeader } from "~/components/admin/PageHeader";
import { PageContent } from "~/components/admin/PageContent";
import { AdminTabs } from "~/components/admin/AdminTabs";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  COLOR_PALETTES,
  CORNER_STYLES,
  FONT_PAIRS,
  SITE_THEMES,
  getCornerRadius,
  getCornerStyleForRadius,
  type ContentAlignment,
  type CornerStyleId,
  type SiteTheme,
  type SiteThemeId,
} from "~/config/themes";
import { cn } from "~/lib/utils";
import { ThemePreview } from "~/components/admin/ThemePreview";
import Link from "next/link";
import {
  Field as ThemeField,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "~/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";

type NavLink = { label: string; href: string };
type SocialLink = { platform: string; url: string };
type Tab = "themes" | "branding" | "nav" | "contact" | "seo";

// ── Font options ───────────────────────────────────────────────────────────────

const BODY_FONTS = [
  "Source Sans 3",
  "Inter",
  "Lato",
  "Open Sans",
  "Roboto",
  "DM Sans",
  "Nunito",
  "Raleway",
  "Poppins",
];

const HEADING_FONTS = [
  "Georgia",
  "Playfair Display",
  "Merriweather",
  "Lora",
  "EB Garamond",
  "Libre Baskerville",
  "Cormorant Garamond",
  "DM Serif Display",
  "Frank Ruhl Libre",
];

// ── Color palettes ─────────────────────────────────────────────────────────────

const PALETTES = [
  {
    name: "Foundation",
    primary: "#8a7d55",
    accent: "#f8f5ee",
    text: "#2c2826",
  },
  { name: "Forest", primary: "#2d6a4f", accent: "#f0f5f0", text: "#1a2e24" },
  { name: "Ocean", primary: "#1e6091", accent: "#eaf4fb", text: "#0a1f2e" },
  { name: "Slate", primary: "#475569", accent: "#f8fafc", text: "#0f172a" },
  { name: "Rose", primary: "#be185d", accent: "#fdf2f8", text: "#3b0a1e" },
  { name: "Amber", primary: "#b45309", accent: "#fffbeb", text: "#1c0e00" },
  { name: "Indigo", primary: "#4338ca", accent: "#eef2ff", text: "#1e1b4b" },
  { name: "Maroon", primary: "#9f1239", accent: "#fff1f2", text: "#2d0a14" },
];

// ── Components ─────────────────────────────────────────────────────────────────

function FontSelect({
  label,
  hint,
  value,
  onChange,
  options,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  const isCustom = !options.includes(value);
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <select
        value={isCustom ? "__custom__" : value}
        onChange={(e) => {
          onChange(e.target.value === "__custom__" ? "" : e.target.value);
        }}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
      >
        {options.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
        <option value="__custom__">Custom…</option>
      </select>
      {isCustom && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Google Font name"
          className="mt-1"
        />
      )}
    </div>
  );
}

const TABS = [
  { id: "themes" as Tab, label: "Themes", icon: SwatchBook },
  { id: "branding" as Tab, label: "Branding", icon: Palette },
  { id: "nav" as Tab, label: "Navigation", icon: Link2 },
  { id: "contact" as Tab, label: "Contact & Social", icon: Phone },
  { id: "seo" as Tab, label: "SEO", icon: Search },
];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[240px_1fr]">
      <div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { data, refetch } = api.settings.get.useQuery();
  const updateMutation = api.settings.update.useMutation();

  const [siteName, setSiteName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [themePreset, setThemePreset] = useState<SiteThemeId>("foundation");
  const [cornerStyle, setCornerStyle] = useState<CornerStyleId>("rounded");
  const [contentAlignment, setContentAlignment] =
    useState<ContentAlignment>("left");
  const [primaryColor, setPrimaryColor] = useState("#8a7d55");
  const [accentColor, setAccentColor] = useState("#f8f5ee");
  const [textColor, setTextColor] = useState("#2c2826");
  const [bodyFont, setBodyFont] = useState("Source Sans 3");
  const [headingFont, setHeadingFont] = useState("Georgia");
  const [navLinks, setNavLinks] = useState<NavLink[]>([]);
  const [footerTagline, setFooterTagline] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("themes");

  useEffect(() => {
    if (!data) return;
    setSiteName(data.siteName ?? "");
    setSiteUrl(data.siteUrl ?? "");
    setLogoUrl(data.logoUrl ?? "");
    setIconUrl(data.iconUrl ?? "");
    setThemePreset(data.themePreset ?? "foundation");
    setCornerStyle(data.cornerStyle ?? "rounded");
    setContentAlignment(data.contentAlignment ?? "left");
    setPrimaryColor(data.primaryColor ?? "#8a7d55");
    setAccentColor(data.accentColor ?? "#f8f5ee");
    setTextColor((data as { textColor?: string }).textColor ?? "#2c2826");
    setBodyFont(data.bodyFont ?? "Source Sans 3");
    setHeadingFont(data.headingFont ?? "Georgia");
    try {
      setNavLinks(JSON.parse(data.navLinks ?? "[]") as NavLink[]);
    } catch {
      setNavLinks([]);
    }
    setFooterTagline(data.footerTagline ?? "");
    setContactEmail(data.contactEmail ?? "");
    setContactPhone(data.contactPhone ?? "");
    setAddress(data.address ?? "");
    try {
      setSocialLinks(JSON.parse(data.socialLinks ?? "[]") as SocialLink[]);
    } catch {
      setSocialLinks([]);
    }
    setSeoTitle(data.seoTitle ?? "");
    setSeoDescription(data.seoDescription ?? "");
  }, [data]);

  // Dynamically load Google Fonts for live preview
  useEffect(() => {
    const SYSTEM_FONTS = new Set([
      "Georgia",
      "Arial",
      "Verdana",
      "Tahoma",
      "Trebuchet MS",
      "Times New Roman",
    ]);
    const families = [bodyFont, headingFont]
      .filter((f) => !SYSTEM_FONTS.has(f))
      .map((f) => `family=${encodeURIComponent(f)}:wght@400;600;700`)
      .join("&");
    if (!families) return;
    const id = "admin-font-preview-link";
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
  }, [bodyFont, headingFont]);

  const handleSave = async (preset?: SiteTheme) => {
    setSaving(true);
    try {
      await updateMutation.mutateAsync({
        siteName,
        siteUrl: siteUrl || null,
        logoUrl: logoUrl || null,
        iconUrl: iconUrl || null,
        themePreset: preset?.id ?? themePreset,
        cornerStyle: preset
          ? getCornerStyleForRadius(preset.radius)
          : cornerStyle,
        contentAlignment,
        layoutPreset: data?.layoutPreset ?? "classic",
        headerStyle: data?.headerStyle ?? "standard",
        footerStyle: data?.footerStyle ?? "columns",
        sectionSpacing: data?.sectionSpacing ?? "balanced",
        buttonStyle: data?.buttonStyle ?? "rounded",
        primaryColor: preset?.primaryColor ?? primaryColor,
        accentColor: preset?.accentColor ?? accentColor,
        textColor: preset?.textColor ?? textColor,
        bodyFont: preset?.bodyFont ?? bodyFont,
        headingFont: preset?.headingFont ?? headingFont,
        navLinks: JSON.stringify(navLinks),
        footerTagline: footerTagline || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        address: address || null,
        socialLinks: JSON.stringify(socialLinks),
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
      });
      toast.success(
        preset ? `${preset.name} theme activated` : "Settings saved",
      );
      await refetch();
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const applyTheme = async (theme: SiteTheme) => {
    setThemePreset(theme.id);
    setPrimaryColor(theme.primaryColor);
    setAccentColor(theme.accentColor);
    setTextColor(theme.textColor);
    setBodyFont(theme.bodyFont);
    setHeadingFont(theme.headingFont);
    setCornerStyle(getCornerStyleForRadius(theme.radius));
    await handleSave(theme);
  };

  const saveButton = (
    <Button onClick={() => void handleSave()} disabled={saving}>
      <Save className="mr-2 h-4 w-4" />
      {saving ? "Saving…" : "Save Settings"}
    </Button>
  );

  const selectedTheme =
    SITE_THEMES.find((theme) => theme.id === themePreset) ?? SITE_THEMES[0]!;
  const selectedPalette =
    COLOR_PALETTES.find(
      (palette) =>
        palette.primaryColor === primaryColor &&
        palette.accentColor === accentColor &&
        palette.textColor === textColor,
    )?.id ?? "";
  const selectedFontPair =
    FONT_PAIRS.find(
      (pair) => pair.bodyFont === bodyFont && pair.headingFont === headingFont,
    )?.id ?? "custom";

  return (
    <PageContent
      maxWidth="max-w-4xl"
      header={
        <PageHeader
          title="Site Settings"
          description="Configure branding, navigation, and metadata"
          actions={saveButton}
        />
      }
      tabs={
        <AdminTabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
      }
    >
      {/* ── Themes ───────────────────────────────────────────────────────── */}
      {activeTab === "themes" && (
        <div className="flex flex-col gap-8">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Choose a site theme</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Themes change the public site’s typography, color system,
                  spacing, corners, header, and footer without changing your
                  content. You can fine-tune the result under Branding.
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href="/admin/onboarding">Run site setup</Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {SITE_THEMES.map((theme) => {
              const active = data?.themePreset === theme.id;
              return (
                <Card
                  key={theme.id}
                  className={cn(
                    "overflow-hidden transition-shadow",
                    active && "ring-2 ring-primary",
                  )}
                >
                  <CardHeader>
                    <CardTitle>{theme.name}</CardTitle>
                    <CardDescription>{theme.description}</CardDescription>
                    {active ? (
                      <CardAction>
                        <Badge>
                          <Check data-icon="inline-start" />
                          Active
                        </Badge>
                      </CardAction>
                    ) : null}
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <ThemePreview theme={theme} />
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        Best for:
                      </span>{" "}
                      {theme.bestFor}
                    </p>
                    <div
                      className="flex items-center gap-2"
                      aria-label={`${theme.name} colors`}
                    >
                      {[
                        theme.primaryColor,
                        theme.accentColor,
                        theme.textColor,
                      ].map((color) => (
                        <span
                          key={color}
                          className="size-5 rounded-full border"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                      <span className="ml-1 text-xs text-muted-foreground">
                        {theme.headingFont} + {theme.bodyFont}
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      aria-label={`${active ? "Reapply" : "Activate"} ${theme.name} theme`}
                      className="w-full"
                      variant={active ? "outline" : "default"}
                      disabled={!data || saving}
                      onClick={() => void applyTheme(theme)}
                    >
                      {active ? "Reapply theme" : "Activate theme"}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Customize your active theme</CardTitle>
              <CardDescription>
                Fine-tune the preset without changing any content. Save Settings
                applies these choices to the public site.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-8 lg:grid-cols-[1fr_0.85fr]">
              <FieldGroup>
                <FieldSet>
                  <FieldLegend>Color palette</FieldLegend>
                  <FieldDescription>
                    Choose a coordinated primary, background, and text palette.
                  </FieldDescription>
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    value={selectedPalette}
                    onValueChange={(value) => {
                      const palette = COLOR_PALETTES.find(
                        (item) => item.id === value,
                      );
                      if (palette) {
                        setPrimaryColor(palette.primaryColor);
                        setAccentColor(palette.accentColor);
                        setTextColor(palette.textColor);
                      }
                    }}
                    className="flex w-full flex-wrap justify-start"
                    spacing={2}
                  >
                    {COLOR_PALETTES.map((palette) => (
                      <ToggleGroupItem
                        key={palette.id}
                        value={palette.id}
                        aria-label={`Use ${palette.name} colors`}
                        className="gap-2"
                      >
                        <span
                          className="size-3 rounded-full"
                          style={{ backgroundColor: palette.primaryColor }}
                        />
                        {palette.name}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </FieldSet>
                <ThemeField>
                  <FieldLabel>Font pairing</FieldLabel>
                  <FieldDescription>
                    Coordinated heading and body fonts.
                  </FieldDescription>
                  <Select
                    value={selectedFontPair}
                    onValueChange={(value) => {
                      const pair = FONT_PAIRS.find((item) => item.id === value);
                      if (pair) {
                        setBodyFont(pair.bodyFont);
                        setHeadingFont(pair.headingFont);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose fonts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {selectedFontPair === "custom" ? (
                          <SelectItem value="custom" disabled>
                            Custom — {headingFont} + {bodyFont}
                          </SelectItem>
                        ) : null}
                        {FONT_PAIRS.map((pair) => (
                          <SelectItem key={pair.id} value={pair.id}>
                            {pair.name} — {pair.headingFont} + {pair.bodyFont}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </ThemeField>
                <FieldSet>
                  <FieldLegend>Corner style</FieldLegend>
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    value={cornerStyle}
                    onValueChange={(value) => {
                      if (value) setCornerStyle(value as CornerStyleId);
                    }}
                    className="flex w-full flex-wrap justify-start"
                    spacing={2}
                  >
                    {CORNER_STYLES.map((style) => (
                      <ToggleGroupItem
                        key={style.id}
                        value={style.id}
                        aria-label={`Use ${style.name} corners`}
                      >
                        <span
                          className="size-4 border-2 border-current"
                          style={{ borderRadius: style.radius }}
                        />
                        {style.name}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </FieldSet>
                <FieldSet>
                  <FieldLegend>Default alignment</FieldLegend>
                  <FieldDescription>
                    Individual content blocks can still override the theme
                    default.
                  </FieldDescription>
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    value={contentAlignment}
                    onValueChange={(value) => {
                      if (value) setContentAlignment(value as ContentAlignment);
                    }}
                    spacing={0}
                  >
                    <ToggleGroupItem
                      value="left"
                      aria-label="Align content left"
                    >
                      <AlignLeft /> Left
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="center"
                      aria-label="Align content center"
                    >
                      <AlignCenter /> Center
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="right"
                      aria-label="Align content right"
                    >
                      <AlignRight /> Right
                    </ToggleGroupItem>
                  </ToggleGroup>
                </FieldSet>
              </FieldGroup>
              <div className="flex flex-col gap-3">
                <p className="text-sm font-medium">Live preview</p>
                <ThemePreview
                  theme={selectedTheme}
                  primaryColor={primaryColor}
                  accentColor={accentColor}
                  textColor={textColor}
                  bodyFont={bodyFont}
                  headingFont={headingFont}
                  radius={getCornerRadius(cornerStyle)}
                  alignment={contentAlignment}
                />
                <p className="text-xs text-muted-foreground">
                  {headingFont} headings · {bodyFont} body
                </p>
              </div>
            </CardContent>
            <CardFooter className="justify-end">{saveButton}</CardFooter>
          </Card>
        </div>
      )}

      {/* ── Branding ──────────────────────────────────────────────────────── */}
      {activeTab === "branding" && (
        <div className="space-y-10">
          <Section
            title="Identity"
            description="The site name and public URL used in metadata and social sharing."
          >
            <Field label="Site Name">
              <Input
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="Your site name"
              />
            </Field>
            <Field
              label="Site URL"
              hint="Used for canonical URLs and open graph tags."
            >
              <Input
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </Field>
          </Section>

          <Separator />

          <Section
            title="Logo & Favicon"
            description="Upload your logo for the site header and a favicon for browser tabs. SVG or PNG recommended."
          >
            <Field label="Logo">
              <ImageUpload value={logoUrl} onChange={setLogoUrl} />
              <div className="mt-3 rounded-xl border bg-muted/30 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <ImageIcon className="h-3 w-3" /> Preview
                </p>
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="rounded-lg bg-background border px-5 py-3.5 shadow-sm min-w-[100px] min-h-[56px] flex items-center justify-center">
                      {logoUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */ <img
                          src={logoUrl}
                          alt="Logo on light"
                          className="h-8 object-contain"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground/40">
                          No logo
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">Light</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="rounded-lg bg-[#2c2c2c] px-5 py-3.5 shadow-sm min-w-[100px] min-h-[56px] flex items-center justify-center">
                      {logoUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */ <img
                          src={logoUrl}
                          alt="Logo on dark"
                          className="h-8 object-contain"
                          style={{ filter: "brightness(2)" }}
                        />
                      ) : (
                        <span className="text-xs text-white/20">No logo</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">Dark</span>
                  </div>
                </div>
              </div>
            </Field>

            <Field label="Favicon">
              <ImageUpload value={iconUrl} onChange={setIconUrl} />
              <div className="mt-3 rounded-xl border bg-muted/30 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <ImageIcon className="h-3 w-3" /> Preview
                </p>
                <div className="flex items-end gap-6">
                  {[
                    { cls: "h-8 w-8", label: "32px" },
                    { cls: "h-4 w-4", label: "16px" },
                  ].map(({ cls, label }) => (
                    <div
                      key={label}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <div className="rounded bg-background border p-2 shadow-sm flex items-center justify-center">
                        {iconUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */ <img
                            src={iconUrl}
                            alt={label}
                            className={`${cls} object-contain`}
                          />
                        ) : (
                          <span
                            className={`${cls} flex items-center justify-center`}
                          >
                            <ImageIcon className="h-3 w-3 text-muted-foreground/30" />
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Field>
          </Section>

          <Separator />

          <Section
            title="Colors"
            description="Primary is used for buttons, links, and UI accents. Accent tints cream/light backgrounds. Text is the default body copy color."
          >
            {/* Palette preset dropdown */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Palette Preset</Label>
              <select
                value={
                  PALETTES.find(
                    (p) =>
                      p.primary === primaryColor &&
                      p.accent === accentColor &&
                      p.text === textColor,
                  )?.name ?? "__custom__"
                }
                onChange={(e) => {
                  const p = PALETTES.find((p) => p.name === e.target.value);
                  if (p) {
                    setPrimaryColor(p.primary);
                    setAccentColor(p.accent);
                    setTextColor(p.text);
                  }
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              >
                {PALETTES.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name} — {p.primary} / {p.accent} / {p.text}
                  </option>
                ))}
                <option value="__custom__">Custom</option>
              </select>
            </div>
            {/* Custom pickers */}
            <div className="grid grid-cols-3 gap-4">
              <Field label="Primary">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-9 w-10 cursor-pointer rounded border border-input bg-background p-0.5 shrink-0"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
              </Field>
              <Field label="Accent / Background">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-9 w-10 cursor-pointer rounded border border-input bg-background p-0.5 shrink-0"
                  />
                  <Input
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
              </Field>
              <Field label="Body Text">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="h-9 w-10 cursor-pointer rounded border border-input bg-background p-0.5 shrink-0"
                  />
                  <Input
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
              </Field>
            </div>
            {/* Live swatch */}
            <div className="flex gap-0 h-10 rounded-lg overflow-hidden border">
              <div
                className="flex-1"
                style={{ backgroundColor: accentColor }}
              />
              <div
                className="w-10 flex items-center justify-center"
                style={{ backgroundColor: primaryColor }}
              >
                <span className="text-xs font-bold text-white">Aa</span>
              </div>
              <div
                className="w-10 flex items-center justify-center"
                style={{ backgroundColor: textColor }}
              >
                <span className="text-xs font-bold text-white">Tt</span>
              </div>
            </div>
          </Section>

          <Separator />

          <Section
            title="Typography"
            description="Choose from common Google Fonts or type any Google Font name."
          >
            <div className="grid grid-cols-2 gap-4">
              <FontSelect
                label="Body Font"
                hint="Used for paragraphs and UI text."
                value={bodyFont}
                onChange={setBodyFont}
                options={BODY_FONTS}
              />
              <FontSelect
                label="Heading Font"
                hint="Used for h1–h4 and display text."
                value={headingFont}
                onChange={setHeadingFont}
                options={HEADING_FONTS}
              />
            </div>
            {/* Live preview */}
            <div className="rounded-lg border bg-muted/20 px-5 py-4 space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Preview
              </p>
              <p
                className="text-xl font-bold"
                style={{ fontFamily: `'${headingFont}', Georgia, serif` }}
              >
                The quick brown fox
              </p>
              <p
                className="text-sm text-muted-foreground"
                style={{
                  fontFamily: `'${bodyFont}', 'Source Sans 3', sans-serif`,
                }}
              >
                Describe what your organization does and the value it creates
                for visitors.
              </p>
            </div>
          </Section>
        </div>
      )}

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      {activeTab === "nav" && (
        <div className="space-y-10">
          <Section
            title="Navigation Links"
            description="Links in the site header and footer nav. Label + path or full URL."
          >
            <div className="space-y-2">
              {navLinks.length === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">
                  No navigation links yet.
                </p>
              )}
              {navLinks.map((link, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={link.label}
                    onChange={(e) => {
                      const u = [...navLinks];
                      u[i] = { ...link, label: e.target.value };
                      setNavLinks(u);
                    }}
                    placeholder="Label"
                    className="w-36 shrink-0"
                  />
                  <Input
                    value={link.href}
                    onChange={(e) => {
                      const u = [...navLinks];
                      u[i] = { ...link, href: e.target.value };
                      setNavLinks(u);
                    }}
                    placeholder="/path"
                    className="flex-1 font-mono text-xs"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      setNavLinks(navLinks.filter((_, j) => j !== i))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setNavLinks([...navLinks, { label: "", href: "" }])
                }
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Link
              </Button>
            </div>
          </Section>

          <Separator />

          <Section
            title="Footer Tagline"
            description="Short text shown in the site footer below the logo."
          >
            <Textarea
              value={footerTagline}
              onChange={(e) => setFooterTagline(e.target.value)}
              rows={2}
              placeholder="Building futures through meaningful work."
              className="resize-none"
            />
          </Section>
        </div>
      )}

      {/* ── Contact & Social ──────────────────────────────────────────────── */}
      {activeTab === "contact" && (
        <div className="space-y-10">
          <Section
            title="Contact Information"
            description="Displayed in the site footer and contact page."
          >
            <Field label="Email">
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="hello@example.com"
              />
            </Field>
            <Field label="Phone">
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
              />
            </Field>
            <Field label="Address">
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St, City, ST 00000"
              />
            </Field>
          </Section>

          <Separator />

          <Section
            title="Social Links"
            description="Links shown as icons or text in the footer. Use full URLs."
          >
            <div className="space-y-2">
              {socialLinks.length === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">
                  No social links yet.
                </p>
              )}
              {socialLinks.map((link, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={link.platform}
                    onChange={(e) => {
                      const u = [...socialLinks];
                      u[i] = { ...link, platform: e.target.value };
                      setSocialLinks(u);
                    }}
                    placeholder="Instagram"
                    className="w-36 shrink-0"
                  />
                  <Input
                    value={link.url}
                    onChange={(e) => {
                      const u = [...socialLinks];
                      u[i] = { ...link, url: e.target.value };
                      setSocialLinks(u);
                    }}
                    placeholder="https://instagram.com/..."
                    className="flex-1 font-mono text-xs"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      setSocialLinks(socialLinks.filter((_, j) => j !== i))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSocialLinks([...socialLinks, { platform: "", url: "" }])
                }
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Link
              </Button>
            </div>
          </Section>
        </div>
      )}

      {/* ── SEO ───────────────────────────────────────────────────────────── */}
      {activeTab === "seo" && (
        <div className="space-y-10">
          <Section
            title="Default Metadata"
            description="Fallback title and description used when individual pages don't define their own."
          >
            <Field
              label="Page Title"
              hint="Shown in the browser tab and search results. Aim for 50–60 characters."
            >
              <Input
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="Your site name"
              />
              <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                {seoTitle.length} / 60
              </p>
            </Field>
            <Field
              label="Meta Description"
              hint="Search snippet. Aim for 120–160 characters."
            >
              <Textarea
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                rows={3}
                className="resize-none"
                placeholder="We build meaningful careers through real work and mentorship."
              />
              <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                {seoDescription.length} / 160
              </p>
            </Field>
          </Section>

          <Separator />

          <Section
            title="Search Preview"
            description="Approximate rendering in Google search results."
          >
            <div className="rounded-xl border bg-background p-5 shadow-sm space-y-1">
              <div className="flex items-center gap-2 mb-1.5">
                {iconUrl ? (
                  <img
                    src={iconUrl}
                    alt=""
                    className="h-4 w-4 rounded-sm object-contain"
                  /> // eslint-disable-line @next/next/no-img-element
                ) : (
                  <Globe className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-xs text-muted-foreground">
                  {siteUrl || "https://yoursite.com"}
                </span>
              </div>
              <p className="text-base font-medium text-blue-600 dark:text-blue-400 truncate">
                {seoTitle || siteName || "Page Title"}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2">
                {seoDescription ||
                  "Your meta description will appear here and help users and search engines understand what this page is about."}
              </p>
            </div>
          </Section>
        </div>
      )}

      {/* Bottom save */}
      <div className="flex justify-end pt-4 border-t">{saveButton}</div>
    </PageContent>
  );
}
