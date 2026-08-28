/**
 * ThemeInjector — async server component.
 *
 * Fetches the active site settings from the DB and injects a `:root {}` style
 * block that overrides the Tailwind design-token CSS custom properties with the
 * admin-configured primary and accent colors. Because this is a server
 * component the style tag is included in the initial HTML — no flash of
 * default colors.
 *
 * Falls back to the compile-time defaults from cms.ts if no settings row
 * exists yet (fresh install) or if the DB is unreachable during a build.
 */

import { db } from "~/server/db";
import { siteSettings } from "~/server/db/schema";
import { defaultTheme } from "~/config/cms";
import { buildThemeCSS } from "~/lib/theme";
import {
  getButtonRadius,
  getCornerRadius,
  getLayoutPreset,
  getSectionSpacing,
  getSiteTheme,
  type ButtonStyleId,
  type ContentAlignment,
  type LayoutPresetId,
  type SectionSpacingId,
} from "~/config/themes";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { resolvePublicSiteId } from "~/lib/sites";

export async function ThemeInjector() {
  const siteId = await resolvePublicSiteId(await headers());
  let primary = defaultTheme.primaryColor;
  let accent = defaultTheme.accentColor;
  let text = defaultTheme.textColor;
  let bodyFont = "Source Sans 3";
  let headingFont = "Georgia";
  let themePreset = "foundation";
  let cornerStyle = "rounded";
  let contentAlignment: ContentAlignment = "left";
  let layoutPreset: LayoutPresetId = "classic";
  let sectionSpacing: SectionSpacingId = "balanced";
  let buttonStyle: ButtonStyleId = "rounded";

  try {
    const row = await db
      .select({
        primaryColor: siteSettings.primaryColor,
        accentColor: siteSettings.accentColor,
        textColor: siteSettings.textColor,
        bodyFont: siteSettings.bodyFont,
        headingFont: siteSettings.headingFont,
        themePreset: siteSettings.themePreset,
        cornerStyle: siteSettings.cornerStyle,
        contentAlignment: siteSettings.contentAlignment,
        layoutPreset: siteSettings.layoutPreset,
        sectionSpacing: siteSettings.sectionSpacing,
        buttonStyle: siteSettings.buttonStyle,
      })
      .from(siteSettings)
      .where(eq(siteSettings.siteId, siteId))
      .get();

    if (row) {
      primary = row.primaryColor;
      accent = row.accentColor;
      text = row.textColor;
      bodyFont = row.bodyFont;
      headingFont = row.headingFont;
      themePreset = row.themePreset;
      cornerStyle = row.cornerStyle;
      contentAlignment = row.contentAlignment;
      layoutPreset = row.layoutPreset;
      sectionSpacing = row.sectionSpacing;
      buttonStyle = row.buttonStyle;
    }
  } catch {
    // DB not ready (e.g. build-time static generation) — use config defaults.
  }

  const preset = getSiteTheme(themePreset);
  const layout = getLayoutPreset(layoutPreset);
  const css = buildThemeCSS({
    primaryColor: primary,
    accentColor: accent,
    textColor: text,
    bodyFont,
    headingFont,
    radius: getCornerRadius(cornerStyle),
    contentWidth: layout.contentWidth || preset.contentWidth,
    contentAlignment,
    sectionSpacing: getSectionSpacing(sectionSpacing),
    buttonRadius: getButtonRadius(buttonStyle),
  });
  const systemFonts = new Set([
    "Georgia",
    "Arial",
    "Verdana",
    "Tahoma",
    "Trebuchet MS",
    "Times New Roman",
  ]);
  const fontFamilies = [
    ...new Set(
      [bodyFont, headingFont].filter(
        (font) => !systemFonts.has(font) && /^[a-zA-Z0-9 ]{1,80}$/.test(font),
      ),
    ),
  ];
  const fontUrl = fontFamilies.length
    ? `https://fonts.googleapis.com/css2?${fontFamilies.map((font) => `family=${encodeURIComponent(font)}:wght@400;500;600;700`).join("&")}&display=swap`
    : null;

  // Values are validated as /^#[0-9a-fA-F]{6}$/ in the settings mutation,
  // so dangerouslySetInnerHTML is safe here.
  return (
    <>
      {fontUrl ? <link rel="stylesheet" href={fontUrl} /> : null}
      <style dangerouslySetInnerHTML={{ __html: css }} />
    </>
  );
}
