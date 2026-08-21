/**
 * theme.ts — utilities for working with hex brand colors at runtime.
 *
 * Used by ThemeInjector to build the `:root` CSS custom-property override
 * that applies the admin-configured primary/accent colors to the live site.
 */

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/** Return true for valid 6-digit hex strings (with leading #). */
export function isValidHex(hex: string): hex is `#${string}` {
  return HEX_RE.test(hex);
}

/** Parse a 6-digit hex color into 0–255 RGB components. */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

/**
 * WCAG relative luminance (0 = black, 1 = white).
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const linearise = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}

/**
 * Return "#ffffff" or "#000000" — whichever achieves better contrast
 * against the given background color.
 */
export function contrastForeground(bg: string): string {
  return relativeLuminance(bg) > 0.179 ? "#000000" : "#ffffff";
}

/**
 * Build the `:root {}` CSS block that overrides the design-token custom
 * properties for the given primary, accent, and text hex values.
 *
 * Only injects properties that are actually used by the Tailwind theme
 * (`--primary`, `--primary-foreground`, `--accent`, `--accent-foreground`,
 * `--foreground`, `--ring`). The defaults in globals.css handle everything else.
 */
function safeFont(value: string, fallback: string): string {
  return /^[a-zA-Z0-9 ]{1,80}$/.test(value) ? `'${value}'` : fallback;
}

function mix(hexA: string, hexB: string, amount: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const channel = (left: number, right: number) =>
    Math.round(left + (right - left) * amount)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(a.r, b.r)}${channel(a.g, b.g)}${channel(a.b, b.b)}`;
}

export function buildThemeCSS({
  primaryColor,
  accentColor,
  textColor,
  bodyFont,
  headingFont,
  radius,
  contentWidth,
  contentAlignment,
  sectionSpacing,
  buttonRadius,
}: {
  primaryColor: string;
  accentColor: string;
  textColor: string;
  bodyFont: string;
  headingFont: string;
  radius: string;
  contentWidth: string;
  contentAlignment: "left" | "center" | "right";
  sectionSpacing: string;
  buttonRadius: string;
}): string {
  const primary = isValidHex(primaryColor) ? primaryColor : "#8a7d55";
  const accent = isValidHex(accentColor) ? accentColor : "#f8f5ee";
  const text = isValidHex(textColor) ? textColor : "#2c2826";

  return [
    `:root {`,
    `  --radius: ${radius};`,
    `  --font-body: ${safeFont(bodyFont, "ui-sans-serif")};`,
    `  --font-heading: ${safeFont(headingFont, "ui-serif")};`,
    `  --site-content-width: ${contentWidth};`,
    `  --site-content-alignment: ${contentAlignment};`,
    `  --section-spacing: ${sectionSpacing};`,
    `  --button-radius: ${buttonRadius};`,
    `  --color-olive: ${primary};`,
    `  --color-olive-dark: ${mix(primary, "#000000", 0.22)};`,
    `  --color-olive-light: ${mix(primary, "#ffffff", 0.32)};`,
    `  --color-cream: ${accent};`,
    `  --color-stone: ${mix(accent, primary, 0.12)};`,
    `  --color-charcoal: ${text};`,
    `}`,
    `:root:not(.dark) {`,
    `  --primary: ${primary};`,
    `  --primary-foreground: ${contrastForeground(primary)};`,
    `  --accent: ${accent};`,
    `  --accent-foreground: ${contrastForeground(accent)};`,
    `  --foreground: ${text};`,
    `  --ring: ${primary};`,
    `}`,
    `.dark {`,
    `  --primary: ${mix(primary, "#ffffff", 0.22)};`,
    `  --primary-foreground: ${contrastForeground(mix(primary, "#ffffff", 0.22))};`,
    `  --ring: ${mix(primary, "#ffffff", 0.22)};`,
    `}`,
  ].join("\n");
}
