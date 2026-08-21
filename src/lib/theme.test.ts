import { describe, expect, it } from "vitest";
import {
  LAYOUT_PRESETS,
  SITE_THEMES,
  getButtonRadius,
  getLayoutPreset,
  getSectionSpacing,
} from "~/config/themes";
import { buildThemeCSS } from "~/lib/theme";

describe("site design presets", () => {
  it("offers distinct photography, technical, and project portfolio layouts", () => {
    expect(LAYOUT_PRESETS.map((preset) => preset.id)).toEqual(
      expect.arrayContaining(["photography", "technical", "projects"]),
    );
    expect(new Set(LAYOUT_PRESETS.map((preset) => preset.id)).size).toBe(
      LAYOUT_PRESETS.length,
    );
    expect(SITE_THEMES.some((theme) => theme.id === "noir")).toBe(true);
  });

  it("falls back safely and maps spacing and button tokens", () => {
    expect(getLayoutPreset("unknown").id).toBe("classic");
    expect(getSectionSpacing("airy")).toBe("7rem");
    expect(getButtonRadius("pill")).toBe("9999px");
  });

  it("emits the public site layout variables", () => {
    const css = buildThemeCSS({
      primaryColor: "#2563eb",
      accentColor: "#eff6ff",
      textColor: "#111827",
      bodyFont: "Inter",
      headingFont: "Poppins",
      radius: "0.375rem",
      contentWidth: "78rem",
      contentAlignment: "left",
      sectionSpacing: "5rem",
      buttonRadius: "0.5rem",
    });
    expect(css).toContain("--site-content-width: 78rem");
    expect(css).toContain("--section-spacing: 5rem");
    expect(css).toContain("--button-radius: 0.5rem");
  });
});
