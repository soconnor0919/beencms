"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
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
import { ThemePreview } from "~/components/admin/ThemePreview";
import {
  COLOR_PALETTES,
  CORNER_STYLES,
  FONT_PAIRS,
  LAYOUT_PRESETS,
  SITE_THEMES,
  getCornerRadius,
  getCornerStyleForRadius,
  type ContentAlignment,
  type CornerStyleId,
  type LayoutPresetId,
  type SiteTheme,
  type SiteThemeId,
} from "~/config/themes";
import { features } from "~/config/cms";
import { cn } from "~/lib/utils";
import { CmsBrand } from "~/components/CmsBrand";

type SectionId =
  "about" | "team" | "programs" | "blog" | "events" | "contact" | "donate";
const ONBOARDING_DRAFT_KEY = "hadlockcms:onboarding-draft";

const STEPS = [
  "Site identity",
  "Choose a theme",
  "Pick sections",
  "Contact & review",
] as const;
const SECTION_OPTIONS: Array<{
  id: SectionId;
  label: string;
  description: string;
  enabled: boolean;
}> = [
  {
    id: "about",
    label: "About",
    description: "Tell visitors your story and mission.",
    enabled: true,
  },
  {
    id: "team",
    label: "Team",
    description: "Introduce staff, leaders, and partners.",
    enabled: features.team,
  },
  {
    id: "programs",
    label: "Programs",
    description: "Showcase services, programs, or companies.",
    enabled: features.programs,
  },
  {
    id: "blog",
    label: "News & articles",
    description: "Publish updates, stories, and editorial content.",
    enabled: features.blog,
  },
  {
    id: "events",
    label: "Events",
    description: "Share a calendar and subscribable event feed.",
    enabled: features.calendar,
  },
  {
    id: "contact",
    label: "Contact",
    description: "Collect messages from site visitors.",
    enabled: features.messages,
  },
  {
    id: "donate",
    label: "Donate",
    description: "Add a prominent donation destination.",
    enabled: true,
  },
];

const PATH_TO_SECTION: Record<string, SectionId> = {
  "/about": "about",
  "/team": "team",
  "/programs": "programs",
  "/blog": "blog",
  "/events": "events",
  "/contact": "contact",
  "/donate": "donate",
};

export default function OnboardingPage() {
  const router = useRouter();
  const initialized = useRef(false);
  const { data, isLoading } = api.settings.get.useQuery();
  const draftKey = `${ONBOARDING_DRAFT_KEY}:${data?.siteId ?? "pending"}`;
  const complete = api.settings.completeOnboarding.useMutation();
  const [step, setStep] = useState(0);
  const [siteName, setSiteName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [tagline, setTagline] = useState("");
  const [theme, setTheme] = useState<SiteThemeId>("foundation");
  const [layoutPreset, setLayoutPreset] = useState<LayoutPresetId>("classic");
  const [primaryColor, setPrimaryColor] = useState(
    SITE_THEMES[0]!.primaryColor,
  );
  const [accentColor, setAccentColor] = useState(SITE_THEMES[0]!.accentColor);
  const [textColor, setTextColor] = useState(SITE_THEMES[0]!.textColor);
  const [bodyFont, setBodyFont] = useState(SITE_THEMES[0]!.bodyFont);
  const [headingFont, setHeadingFont] = useState(SITE_THEMES[0]!.headingFont);
  const [cornerStyle, setCornerStyle] = useState<CornerStyleId>("rounded");
  const [contentAlignment, setContentAlignment] =
    useState<ContentAlignment>("left");
  const [sections, setSections] = useState<SectionId[]>(
    SECTION_OPTIONS.filter((item) => item.enabled).map((item) => item.id),
  );
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (!data || initialized.current) return;
    initialized.current = true;
    setSiteName(data.siteName ?? "");
    setSiteUrl(data.siteUrl ?? "");
    setTagline(data.footerTagline ?? "");
    setTheme(data.themePreset ?? "foundation");
    setLayoutPreset(data.layoutPreset ?? "classic");
    setPrimaryColor(data.primaryColor);
    setAccentColor(data.accentColor);
    setTextColor(data.textColor);
    setBodyFont(data.bodyFont);
    setHeadingFont(data.headingFont);
    setCornerStyle(data.cornerStyle ?? "rounded");
    setContentAlignment(data.contentAlignment ?? "left");
    setContactEmail(data.contactEmail ?? "");
    setContactPhone(data.contactPhone ?? "");
    setAddress(data.address ?? "");
    try {
      const links = JSON.parse(data.navLinks ?? "[]") as Array<{
        href?: string;
      }>;
      const configured = links
        .map((link) => PATH_TO_SECTION[link.href ?? ""])
        .filter((value): value is SectionId => Boolean(value));
      if (configured.length) setSections(configured);
    } catch {
      /* Keep the complete default selection. */
    }
    try {
      const saved = sessionStorage.getItem(
        `${ONBOARDING_DRAFT_KEY}:${data.siteId}`,
      );
      if (saved) {
        const draft = JSON.parse(saved) as {
          siteName: string;
          siteUrl: string;
          tagline: string;
          theme: SiteThemeId;
          layoutPreset: LayoutPresetId;
          primaryColor: string;
          accentColor: string;
          textColor: string;
          bodyFont: string;
          headingFont: string;
          cornerStyle: CornerStyleId;
          contentAlignment: ContentAlignment;
          sections: SectionId[];
          contactEmail: string;
          contactPhone: string;
          address: string;
        };
        setSiteName(draft.siteName);
        setSiteUrl(draft.siteUrl);
        setTagline(draft.tagline);
        setTheme(draft.theme);
        setLayoutPreset(draft.layoutPreset ?? "classic");
        setPrimaryColor(draft.primaryColor);
        setAccentColor(draft.accentColor);
        setTextColor(draft.textColor);
        setBodyFont(draft.bodyFont);
        setHeadingFont(draft.headingFont);
        setCornerStyle(draft.cornerStyle);
        setContentAlignment(draft.contentAlignment);
        setSections(draft.sections);
        setContactEmail(draft.contactEmail);
        setContactPhone(draft.contactPhone);
        setAddress(draft.address);
        toast.info("Your setup choices were restored after signing in");
      }
    } catch {
      sessionStorage.removeItem(`${ONBOARDING_DRAFT_KEY}:${data.siteId}`);
    }
  }, [data]);

  const selectedTheme =
    SITE_THEMES.find((item) => item.id === theme) ?? SITE_THEMES[0]!;
  const selectedLayout =
    LAYOUT_PRESETS.find((item) => item.id === layoutPreset) ??
    LAYOUT_PRESETS[0]!;
  const selectedPalette =
    COLOR_PALETTES.find(
      (item) =>
        item.primaryColor === primaryColor &&
        item.accentColor === accentColor &&
        item.textColor === textColor,
    )?.id ?? "";
  const selectedFontPair =
    FONT_PAIRS.find(
      (item) => item.bodyFont === bodyFont && item.headingFont === headingFont,
    )?.id ?? "custom";
  const canContinue =
    step === 0
      ? siteName.trim().length > 0
      : step === 2
        ? sections.length > 0
        : true;
  const toggleSection = (id: SectionId) =>
    setSections((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  const chooseTheme = (item: SiteTheme) => {
    setTheme(item.id);
    setPrimaryColor(item.primaryColor);
    setAccentColor(item.accentColor);
    setTextColor(item.textColor);
    setBodyFont(item.bodyFont);
    setHeadingFont(item.headingFont);
    setCornerStyle(getCornerStyleForRadius(item.radius));
  };

  const finish = async () => {
    try {
      await complete.mutateAsync({
        siteName: siteName.trim(),
        siteUrl: siteUrl.trim() || null,
        footerTagline: tagline.trim() || null,
        themePreset: theme,
        layoutPreset,
        primaryColor,
        accentColor,
        textColor,
        bodyFont,
        headingFont,
        cornerStyle,
        contentAlignment,
        sections,
        contactEmail: contactEmail.trim() || null,
        contactPhone: contactPhone.trim() || null,
        address: address.trim() || null,
      });
      sessionStorage.removeItem(draftKey);
      toast.success("Your site is ready to edit");
      router.push("/admin");
      router.refresh();
    } catch (error) {
      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        sessionStorage.setItem(
          draftKey,
          JSON.stringify({
            siteName,
            siteUrl,
            tagline,
            theme,
            layoutPreset,
            primaryColor,
            accentColor,
            textColor,
            bodyFont,
            headingFont,
            cornerStyle,
            contentAlignment,
            sections,
            contactEmail,
            contactPhone,
            address,
          }),
        );
        window.location.assign(
          "/admin/login?next=/admin/onboarding&reason=session-expired",
        );
        return;
      }
      toast.error(
        error instanceof Error ? error.message : "Setup could not be completed",
      );
    }
  };

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CmsBrand showCompany />
            <span className="sr-only">Site setup</span>
          </div>
          {data?.onboardingComplete ? (
            <Button asChild variant="ghost">
              <Link href="/admin/settings">Exit setup</Link>
            </Button>
          ) : (
            <Badge variant="secondary">
              <Sparkles className="size-3" /> First-time setup
            </Badge>
          )}
        </header>

        <div
          className="mb-6 grid grid-cols-4 gap-2"
          aria-label={`Setup progress: step ${step + 1} of ${STEPS.length}`}
        >
          {STEPS.map((label, index) => (
            <div key={label} className="space-y-2">
              <div
                className={cn(
                  "h-1.5 rounded-full transition-colors",
                  index <= step ? "bg-primary" : "bg-border",
                )}
              />
              <p
                className={cn(
                  "hidden text-xs sm:block",
                  index === step
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {index + 1}. {label}
              </p>
            </div>
          ))}
        </div>

        <Card className="overflow-hidden shadow-lg">
          {isLoading ? (
            <CardContent className="flex min-h-[440px] items-center justify-center text-sm text-muted-foreground">
              Loading your site…
            </CardContent>
          ) : (
            <>
              {step === 0 && (
                <>
                  <CardHeader className="border-b bg-background/80 px-6 py-7 sm:px-10">
                    <Badge className="mb-2 w-fit" variant="secondary">
                      Step 1 of 4
                    </Badge>
                    <CardTitle className="text-2xl sm:text-3xl">
                      Let’s give your site an identity
                    </CardTitle>
                    <CardDescription className="max-w-2xl text-base">
                      Start with the essentials visitors and search engines will
                      see. You can change everything later.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6 px-6 py-8 sm:px-10 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="site-name">Site name</Label>
                      <Input
                        id="site-name"
                        autoFocus
                        value={siteName}
                        onChange={(event) => setSiteName(event.target.value)}
                        placeholder="Acme Community Center"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="site-url">
                        Public site URL{" "}
                        <span className="font-normal text-muted-foreground">
                          (optional)
                        </span>
                      </Label>
                      <Input
                        id="site-url"
                        type="url"
                        value={siteUrl}
                        onChange={(event) => setSiteUrl(event.target.value)}
                        placeholder="https://example.org"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tagline">
                        Short tagline{" "}
                        <span className="font-normal text-muted-foreground">
                          (optional)
                        </span>
                      </Label>
                      <Input
                        id="tagline"
                        value={tagline}
                        onChange={(event) => setTagline(event.target.value)}
                        placeholder="A short statement of purpose"
                      />
                    </div>
                  </CardContent>
                </>
              )}

              {step === 1 && (
                <>
                  <CardHeader className="border-b bg-background/80 px-6 py-7 sm:px-10">
                    <Badge className="mb-2 w-fit" variant="secondary">
                      Step 2 of 4
                    </Badge>
                    <CardTitle className="text-2xl sm:text-3xl">
                      Choose your starting theme
                    </CardTitle>
                    <CardDescription className="max-w-2xl text-base">
                      Pick a complete visual foundation—like a WordPress theme.
                      Your content stays independent, so switching later is
                      easy.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-8 px-6 py-8 sm:px-10">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {SITE_THEMES.map((item) => {
                        const selected = item.id === theme;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            aria-label={`Choose ${item.name} theme`}
                            aria-pressed={selected}
                            onClick={() => chooseTheme(item)}
                            className={cn(
                              "rounded-xl border bg-card p-3 text-left transition hover:border-primary/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              selected && "border-primary ring-2 ring-primary",
                            )}
                          >
                            <ThemePreview theme={item} />
                            <div className="mt-3 flex items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold">{item.name}</p>
                                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                                  {item.description}
                                </p>
                              </div>
                              {selected && (
                                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                  <Check className="size-3.5" />
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <Card className="bg-muted/20">
                      <CardHeader>
                        <CardTitle>Customize {selectedTheme.name}</CardTitle>
                        <CardDescription>
                          Use the preset as a starting point, then make the
                          design yours.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
                        <FieldGroup>
                          <FieldSet>
                            <FieldLegend>Site layout</FieldLegend>
                            <FieldDescription>
                              Choose a starting structure for your type of
                              website.
                            </FieldDescription>
                            <ToggleGroup
                              type="single"
                              variant="outline"
                              value={layoutPreset}
                              onValueChange={(value) =>
                                value &&
                                setLayoutPreset(value as LayoutPresetId)
                              }
                              className="flex w-full flex-wrap justify-start"
                              spacing={2}
                            >
                              {LAYOUT_PRESETS.map((layout) => (
                                <ToggleGroupItem
                                  key={layout.id}
                                  value={layout.id}
                                >
                                  {layout.name}
                                </ToggleGroupItem>
                              ))}
                            </ToggleGroup>
                          </FieldSet>
                          <FieldSet>
                            <FieldLegend>Color palette</FieldLegend>
                            <FieldDescription>
                              Choose a coordinated primary, background, and text
                              palette.
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
                                    style={{
                                      backgroundColor: palette.primaryColor,
                                    }}
                                  />
                                  {palette.name}
                                </ToggleGroupItem>
                              ))}
                            </ToggleGroup>
                          </FieldSet>
                          <Field>
                            <FieldLabel>Font pairing</FieldLabel>
                            <FieldDescription>
                              Coordinated heading and body fonts.
                            </FieldDescription>
                            <Select
                              value={selectedFontPair}
                              onValueChange={(value) => {
                                const pair = FONT_PAIRS.find(
                                  (item) => item.id === value,
                                );
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
                                      {pair.name} — {pair.headingFont} +{" "}
                                      {pair.bodyFont}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </Field>
                          <FieldSet>
                            <FieldLegend>Corner style</FieldLegend>
                            <ToggleGroup
                              type="single"
                              variant="outline"
                              value={cornerStyle}
                              onValueChange={(value) => {
                                if (value)
                                  setCornerStyle(value as CornerStyleId);
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
                              Individual content blocks can still override this.
                            </FieldDescription>
                            <ToggleGroup
                              type="single"
                              variant="outline"
                              value={contentAlignment}
                              onValueChange={(value) => {
                                if (value)
                                  setContentAlignment(
                                    value as ContentAlignment,
                                  );
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
                            layout={selectedLayout}
                            primaryColor={primaryColor}
                            accentColor={accentColor}
                            textColor={textColor}
                            bodyFont={bodyFont}
                            headingFont={headingFont}
                            radius={getCornerRadius(cornerStyle)}
                            alignment={contentAlignment}
                          />
                          <p className="text-xs text-muted-foreground">
                            {selectedLayout.name} · {headingFont} headings ·{" "}
                            {bodyFont} body
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </CardContent>
                </>
              )}

              {step === 2 && (
                <>
                  <CardHeader className="border-b bg-background/80 px-6 py-7 sm:px-10">
                    <Badge className="mb-2 w-fit" variant="secondary">
                      Step 3 of 4
                    </Badge>
                    <CardTitle className="text-2xl sm:text-3xl">
                      What belongs in your site?
                    </CardTitle>
                    <CardDescription className="max-w-2xl text-base">
                      Choose the sections to put in your main navigation. This
                      does not delete any existing content.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-6 py-8 sm:px-10">
                    <fieldset className="grid gap-3 md:grid-cols-2">
                      <legend className="sr-only">Site sections</legend>
                      {SECTION_OPTIONS.filter((item) => item.enabled).map(
                        (item) => {
                          const selected = sections.includes(item.id);
                          return (
                            <label
                              key={item.id}
                              className={cn(
                                "flex cursor-pointer gap-3 rounded-xl border p-4 transition hover:bg-muted/40",
                                selected && "border-primary bg-primary/5",
                              )}
                            >
                              <input
                                className="mt-1 size-4 accent-primary"
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleSection(item.id)}
                              />
                              <span>
                                <span className="block font-medium">
                                  {item.label}
                                </span>
                                <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                                  {item.description}
                                </span>
                              </span>
                            </label>
                          );
                        },
                      )}
                    </fieldset>
                    {sections.length === 0 && (
                      <p className="mt-3 text-sm text-destructive">
                        Choose at least one section.
                      </p>
                    )}
                  </CardContent>
                </>
              )}

              {step === 3 && (
                <>
                  <CardHeader className="border-b bg-background/80 px-6 py-7 sm:px-10">
                    <Badge className="mb-2 w-fit" variant="secondary">
                      Step 4 of 4
                    </Badge>
                    <CardTitle className="text-2xl sm:text-3xl">
                      Add contact details and review
                    </CardTitle>
                    <CardDescription className="max-w-2xl text-base">
                      These details can appear across your site. Leave anything
                      blank that you are not ready to publish.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-8 px-6 py-8 sm:px-10 md:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="contact-email">Contact email</Label>
                        <Input
                          id="contact-email"
                          type="email"
                          value={contactEmail}
                          onChange={(event) =>
                            setContactEmail(event.target.value)
                          }
                          placeholder="hello@example.org"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact-phone">Phone</Label>
                        <Input
                          id="contact-phone"
                          type="tel"
                          value={contactPhone}
                          onChange={(event) =>
                            setContactPhone(event.target.value)
                          }
                          placeholder="(555) 123-4567"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Textarea
                          id="address"
                          value={address}
                          onChange={(event) => setAddress(event.target.value)}
                          placeholder="Street, city, state, postal code"
                          rows={3}
                        />
                      </div>
                    </div>
                    <aside className="rounded-xl border bg-muted/35 p-5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Setup summary
                      </p>
                      <h3 className="mt-3 text-xl font-semibold">{siteName}</h3>
                      {tagline && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {tagline}
                        </p>
                      )}
                      <div className="mt-5 space-y-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Theme</span>
                          <Badge variant="outline">{selectedTheme.name}</Badge>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Design</span>
                          <span className="text-right font-medium capitalize">
                            {cornerStyle} · {contentAlignment}
                          </span>
                        </div>
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-muted-foreground">
                            Navigation
                          </span>
                          <span className="max-w-48 text-right font-medium">
                            {sections
                              .map(
                                (id) =>
                                  SECTION_OPTIONS.find((item) => item.id === id)
                                    ?.label,
                              )
                              .join(", ")}
                          </span>
                        </div>
                      </div>
                      <div className="mt-6 flex items-center gap-2 border-t pt-4 text-sm text-muted-foreground">
                        <CheckCircle2 className="size-4 text-primary" />{" "}
                        Existing pages and content are preserved.
                      </div>
                    </aside>
                  </CardContent>
                </>
              )}

              <CardFooter className="flex justify-between border-t bg-muted/20 px-6 py-5 sm:px-10">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={step === 0 || complete.isPending}
                  onClick={() => setStep((current) => Math.max(0, current - 1))}
                >
                  <ArrowLeft /> Back
                </Button>
                {step < STEPS.length - 1 ? (
                  <Button
                    type="button"
                    disabled={!canContinue}
                    onClick={() =>
                      setStep((current) =>
                        Math.min(STEPS.length - 1, current + 1),
                      )
                    }
                  >
                    Continue <ArrowRight />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={complete.isPending}
                    onClick={() => void finish()}
                  >
                    {complete.isPending ? "Finishing…" : "Finish setup"}{" "}
                    <Check />
                  </Button>
                )}
              </CardFooter>
            </>
          )}
        </Card>
        <p className="mt-5 text-center text-xs text-muted-foreground">
          Nothing is published or removed until you finish setup.
        </p>
      </div>
    </main>
  );
}
