"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ExternalLink, Paintbrush, Save } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { api } from "~/trpc/react";
import { AdminTabs } from "~/components/admin/AdminTabs";
import { PageContent } from "~/components/admin/PageContent";
import { PageHeader } from "~/components/admin/PageHeader";
import { ThemePreview } from "~/components/admin/ThemePreview";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
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
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import {
  COLOR_PALETTES,
  CORNER_STYLES,
  FONT_PAIRS,
  LAYOUT_PRESETS,
  SITE_THEMES,
  getCornerRadius,
  getCornerStyleForRadius,
  type ButtonStyleId,
  type ContentAlignment,
  type CornerStyleId,
  type FooterStyleId,
  type HeaderStyleId,
  type LayoutPresetId,
  type SectionSpacingId,
  type SiteThemeId,
} from "~/config/themes";
import { cn } from "~/lib/utils";

type DesignTab = "layouts" | "themes" | "customize";

export default function DesignStudioPage() {
  const { data, refetch } = api.settings.get.useQuery();
  const update = api.settings.update.useMutation();
  const [tab, setTab] = useState<DesignTab>("layouts");
  const [themePreset, setThemePreset] = useState<SiteThemeId>("foundation");
  const [layoutPreset, setLayoutPreset] = useState<LayoutPresetId>("classic");
  const [primaryColor, setPrimaryColor] = useState("#8a7d55");
  const [accentColor, setAccentColor] = useState("#f8f5ee");
  const [textColor, setTextColor] = useState("#2c2826");
  const [bodyFont, setBodyFont] = useState("Source Sans 3");
  const [headingFont, setHeadingFont] = useState("Georgia");
  const [cornerStyle, setCornerStyle] = useState<CornerStyleId>("rounded");
  const [alignment, setAlignment] = useState<ContentAlignment>("left");
  const [headerStyle, setHeaderStyle] = useState<HeaderStyleId>("standard");
  const [footerStyle, setFooterStyle] = useState<FooterStyleId>("columns");
  const [sectionSpacing, setSectionSpacing] =
    useState<SectionSpacingId>("balanced");
  const [buttonStyle, setButtonStyle] = useState<ButtonStyleId>("rounded");

  useEffect(() => {
    if (!data) return;
    setThemePreset(data.themePreset);
    setLayoutPreset(data.layoutPreset);
    setPrimaryColor(data.primaryColor);
    setAccentColor(data.accentColor);
    setTextColor(data.textColor);
    setBodyFont(data.bodyFont);
    setHeadingFont(data.headingFont);
    setCornerStyle(data.cornerStyle);
    setAlignment(data.contentAlignment);
    setHeaderStyle(data.headerStyle);
    setFooterStyle(data.footerStyle);
    setSectionSpacing(data.sectionSpacing);
    setButtonStyle(data.buttonStyle);
  }, [data]);

  const theme = useMemo(
    () =>
      SITE_THEMES.find((item) => item.id === themePreset) ?? SITE_THEMES[0]!,
    [themePreset],
  );
  const layout = useMemo(
    () =>
      LAYOUT_PRESETS.find((item) => item.id === layoutPreset) ??
      LAYOUT_PRESETS[0]!,
    [layoutPreset],
  );
  const palette =
    COLOR_PALETTES.find(
      (item) =>
        item.primaryColor === primaryColor &&
        item.accentColor === accentColor &&
        item.textColor === textColor,
    )?.id ?? "";
  const fontPair =
    FONT_PAIRS.find(
      (item) => item.bodyFont === bodyFont && item.headingFont === headingFont,
    )?.id ?? "custom";

  const chooseTheme = (id: SiteThemeId) => {
    const next = SITE_THEMES.find((item) => item.id === id)!;
    setThemePreset(next.id);
    setPrimaryColor(next.primaryColor);
    setAccentColor(next.accentColor);
    setTextColor(next.textColor);
    setBodyFont(next.bodyFont);
    setHeadingFont(next.headingFont);
    setCornerStyle(getCornerStyleForRadius(next.radius));
  };

  const chooseLayout = (id: LayoutPresetId) => {
    const next = LAYOUT_PRESETS.find((item) => item.id === id)!;
    setLayoutPreset(next.id);
    setHeaderStyle(next.headerStyle);
    setFooterStyle(next.footerStyle);
    setSectionSpacing(next.sectionSpacing);
    setButtonStyle(next.buttonStyle);
  };

  const save = async () => {
    if (!data) return;
    try {
      await update.mutateAsync({
        siteName: data.siteName,
        siteUrl: data.siteUrl,
        logoUrl: data.logoUrl,
        iconUrl: data.iconUrl,
        themePreset,
        layoutPreset,
        headerStyle,
        footerStyle,
        sectionSpacing,
        buttonStyle,
        cornerStyle,
        contentAlignment: alignment,
        primaryColor,
        accentColor,
        textColor,
        bodyFont,
        headingFont,
        navLinks: data.navLinks,
        footerTagline: data.footerTagline,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        address: data.address,
        socialLinks: data.socialLinks,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
      });
      toast.success("Site design published");
      await refetch();
    } catch {
      toast.error("Could not save the site design");
    }
  };

  const preview = (
    <ThemePreview
      className="min-h-72"
      theme={theme}
      layout={{
        ...layout,
        headerStyle,
        footerStyle,
        sectionSpacing,
        buttonStyle,
      }}
      primaryColor={primaryColor}
      accentColor={accentColor}
      textColor={textColor}
      bodyFont={bodyFont}
      headingFont={headingFont}
      radius={getCornerRadius(cornerStyle)}
      alignment={alignment}
    />
  );

  return (
    <PageContent
      maxWidth="max-w-6xl"
      header={
        <PageHeader
          title="Design Studio"
          description="Shape the site with reusable layouts, themes, and design tokens."
          actions={
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/" target="_blank">
                  <ExternalLink data-icon="inline-start" />
                  View site
                </Link>
              </Button>
              <Button
                onClick={() => void save()}
                disabled={!data || update.isPending}
              >
                <Save data-icon="inline-start" />
                {update.isPending ? "Publishing…" : "Publish design"}
              </Button>
            </div>
          }
        />
      }
      tabs={
        <AdminTabs
          tabs={[
            { id: "layouts", label: "Layout presets", icon: Paintbrush },
            { id: "themes", label: "Theme presets", icon: Paintbrush },
            { id: "customize", label: "Customize", icon: Paintbrush },
          ]}
          active={tab}
          onChange={setTab}
        />
      }
    >
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div>
          {tab === "layouts" ? (
            <div className="grid gap-5 md:grid-cols-2">
              {LAYOUT_PRESETS.map((item) => (
                <Card
                  key={item.id}
                  className={cn(
                    "overflow-hidden",
                    layoutPreset === item.id && "ring-2 ring-primary",
                  )}
                >
                  <CardHeader>
                    <CardTitle>{item.name}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                    {layoutPreset === item.id ? (
                      <CardAction>
                        <Badge>
                          <Check data-icon="inline-start" />
                          Selected
                        </Badge>
                      </CardAction>
                    ) : null}
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <ThemePreview
                      theme={SITE_THEMES.find(
                        (candidate) => candidate.id === item.recommendedTheme,
                      )!}
                      layout={item}
                    />
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        Best for:
                      </span>{" "}
                      {item.bestFor}
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      variant={layoutPreset === item.id ? "outline" : "default"}
                      onClick={() => chooseLayout(item.id)}
                    >
                      {layoutPreset === item.id ? "Selected" : "Use layout"}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : null}
          {tab === "themes" ? (
            <div className="grid gap-5 md:grid-cols-2">
              {SITE_THEMES.map((item) => (
                <Card
                  key={item.id}
                  className={cn(
                    "overflow-hidden",
                    themePreset === item.id && "ring-2 ring-primary",
                  )}
                >
                  <CardHeader>
                    <CardTitle>{item.name}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                    {themePreset === item.id ? (
                      <CardAction>
                        <Badge>
                          <Check data-icon="inline-start" />
                          Selected
                        </Badge>
                      </CardAction>
                    ) : null}
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <ThemePreview theme={item} layout={layout} />
                    <div className="flex items-center gap-2">
                      {[
                        item.primaryColor,
                        item.accentColor,
                        item.textColor,
                      ].map((color) => (
                        <span
                          key={color}
                          className="size-5 rounded-full border"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                      <span className="ml-1 text-xs text-muted-foreground">
                        {item.headingFont} + {item.bodyFont}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        Best for:
                      </span>{" "}
                      {item.bestFor}
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      variant={themePreset === item.id ? "outline" : "default"}
                      onClick={() => chooseTheme(item.id)}
                    >
                      {themePreset === item.id ? "Selected" : "Use theme"}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : null}
          {tab === "customize" ? (
            <Card>
              <CardHeader>
                <CardTitle>Design tokens</CardTitle>
                <CardDescription>
                  Fine-tune your preset. Changes stay in this preview until you
                  publish.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <FieldSet>
                    <FieldLegend>Palette</FieldLegend>
                    <FieldDescription>
                      Start from a coordinated palette or edit individual colors
                      below.
                    </FieldDescription>
                    <ToggleGroup
                      type="single"
                      variant="outline"
                      value={palette}
                      onValueChange={(value) => {
                        const next = COLOR_PALETTES.find(
                          (item) => item.id === value,
                        );
                        if (next) {
                          setPrimaryColor(next.primaryColor);
                          setAccentColor(next.accentColor);
                          setTextColor(next.textColor);
                        }
                      }}
                      className="flex flex-wrap justify-start"
                      spacing={2}
                    >
                      {COLOR_PALETTES.map((item) => (
                        <ToggleGroupItem key={item.id} value={item.id}>
                          <span
                            className="size-3 rounded-full"
                            style={{ backgroundColor: item.primaryColor }}
                          />
                          {item.name}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        ["Primary", primaryColor, setPrimaryColor],
                        ["Surface", accentColor, setAccentColor],
                        ["Text", textColor, setTextColor],
                      ].map(([label, value, setter]) => (
                        <Field key={label as string}>
                          <FieldLabel>{label as string}</FieldLabel>
                          <div className="flex gap-2">
                            <input
                              aria-label={`${label as string} color`}
                              type="color"
                              value={value as string}
                              onChange={(event) =>
                                (setter as (value: string) => void)(
                                  event.target.value,
                                )
                              }
                              className="h-9 w-11 rounded-md border bg-background p-1"
                            />
                            <Input
                              value={value as string}
                              onChange={(event) =>
                                (setter as (value: string) => void)(
                                  event.target.value,
                                )
                              }
                            />
                          </div>
                        </Field>
                      ))}
                    </div>
                  </FieldSet>
                  <Field>
                    <FieldLabel>Font pairing</FieldLabel>
                    <Select
                      value={fontPair}
                      onValueChange={(value) => {
                        const next = FONT_PAIRS.find(
                          (item) => item.id === value,
                        );
                        if (next) {
                          setBodyFont(next.bodyFont);
                          setHeadingFont(next.headingFont);
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fontPair === "custom" ? (
                          <SelectItem value="custom" disabled>
                            Custom fonts
                          </SelectItem>
                        ) : null}
                        {FONT_PAIRS.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} — {item.headingFont} + {item.bodyFont}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <FieldSet>
                    <FieldLegend>Shape</FieldLegend>
                    <div className="grid gap-5 md:grid-cols-2">
                      <Field>
                        <FieldLabel>Corner style</FieldLabel>
                        <ToggleGroup
                          type="single"
                          variant="outline"
                          value={cornerStyle}
                          onValueChange={(value) =>
                            value && setCornerStyle(value as CornerStyleId)
                          }
                        >
                          {CORNER_STYLES.map((item) => (
                            <ToggleGroupItem key={item.id} value={item.id}>
                              {item.name}
                            </ToggleGroupItem>
                          ))}
                        </ToggleGroup>
                      </Field>
                      <Field>
                        <FieldLabel>Buttons</FieldLabel>
                        <ToggleGroup
                          type="single"
                          variant="outline"
                          value={buttonStyle}
                          onValueChange={(value) =>
                            value && setButtonStyle(value as ButtonStyleId)
                          }
                        >
                          <ToggleGroupItem value="square">
                            Square
                          </ToggleGroupItem>
                          <ToggleGroupItem value="rounded">
                            Rounded
                          </ToggleGroupItem>
                          <ToggleGroupItem value="pill">Pill</ToggleGroupItem>
                        </ToggleGroup>
                      </Field>
                    </div>
                  </FieldSet>
                  <FieldSet>
                    <FieldLegend>Site structure</FieldLegend>
                    <div className="grid gap-5 md:grid-cols-2">
                      <Field>
                        <FieldLabel>Header</FieldLabel>
                        <Select
                          value={headerStyle}
                          onValueChange={(value) =>
                            setHeaderStyle(value as HeaderStyleId)
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="centered">Centered</SelectItem>
                            <SelectItem value="minimal">Minimal</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field>
                        <FieldLabel>Footer</FieldLabel>
                        <Select
                          value={footerStyle}
                          onValueChange={(value) =>
                            setFooterStyle(value as FooterStyleId)
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="columns">Columns</SelectItem>
                            <SelectItem value="centered">Centered</SelectItem>
                            <SelectItem value="minimal">Minimal</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field>
                        <FieldLabel>Section spacing</FieldLabel>
                        <Select
                          value={sectionSpacing}
                          onValueChange={(value) =>
                            setSectionSpacing(value as SectionSpacingId)
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="compact">Compact</SelectItem>
                            <SelectItem value="balanced">Balanced</SelectItem>
                            <SelectItem value="airy">Airy</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field>
                        <FieldLabel>Default alignment</FieldLabel>
                        <Select
                          value={alignment}
                          onValueChange={(value) =>
                            setAlignment(value as ContentAlignment)
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="left">Left</SelectItem>
                            <SelectItem value="center">Center</SelectItem>
                            <SelectItem value="right">Right</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                  </FieldSet>
                </FieldGroup>
              </CardContent>
            </Card>
          ) : null}
        </div>
        <aside className="xl:sticky xl:top-6 xl:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Live preview</CardTitle>
              <CardDescription>
                {layout.name} · {theme.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {preview}
              <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Heading</p>
                  <p className="mt-1 font-medium">{headingFont}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Body</p>
                  <p className="mt-1 font-medium">{bodyFont}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Header</p>
                  <p className="mt-1 capitalize">{headerStyle}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Spacing</p>
                  <p className="mt-1 capitalize">{sectionSpacing}</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex-col items-stretch gap-2">
              <Button
                onClick={() => void save()}
                disabled={!data || update.isPending}
              >
                <Save data-icon="inline-start" />
                Publish design
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Presets never replace your pages or media.
              </p>
            </CardFooter>
          </Card>
        </aside>
      </div>
    </PageContent>
  );
}
