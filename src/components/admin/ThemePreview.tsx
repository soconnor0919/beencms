import type {
  ContentAlignment,
  LayoutPreset,
  SiteTheme,
} from "~/config/themes";

export function ThemePreview({
  theme,
  layout,
  primaryColor = theme.primaryColor,
  accentColor = theme.accentColor,
  textColor = theme.textColor,
  radius = theme.radius,
  headingFont = theme.headingFont,
  bodyFont = theme.bodyFont,
  alignment = "left",
  className = "",
}: {
  theme: SiteTheme;
  layout?: LayoutPreset;
  primaryColor?: string;
  accentColor?: string;
  textColor?: string;
  radius?: string;
  headingFont?: string;
  bodyFont?: string;
  alignment?: ContentAlignment;
  className?: string;
}) {
  const alignItems =
    alignment === "center"
      ? "center"
      : alignment === "right"
        ? "flex-end"
        : "flex-start";
  const centeredHeader = layout?.headerStyle === "centered";
  const minimalHeader = layout?.headerStyle === "minimal";
  const preview = layout?.preview ?? "classic";
  const imageCells =
    preview === "masonry"
      ? ["h-20", "h-28", "h-24", "h-16", "h-28", "h-20"]
      : ["h-20", "h-20", "h-20"];

  return (
    <div
      className={`overflow-hidden border bg-white shadow-sm ${className}`}
      style={{
        borderRadius: radius,
        color: textColor,
        fontFamily: `'${bodyFont}', sans-serif`,
      }}
    >
      <div
        className={`flex border-b px-4 py-3 ${centeredHeader ? "flex-col items-center gap-2" : "items-center justify-between"}`}
        style={{
          borderColor: `${primaryColor}33`,
          backgroundColor: minimalHeader ? accentColor : "#ffffff",
        }}
      >
        <div
          className="h-2.5 w-20"
          style={{ backgroundColor: textColor, borderRadius: radius }}
        />
        <div className="flex gap-2">
          <span
            className="h-1.5 w-7"
            style={{ backgroundColor: textColor, opacity: 0.55 }}
          />
          <span
            className="h-1.5 w-7"
            style={{ backgroundColor: textColor, opacity: 0.55 }}
          />
          <span
            className="h-1.5 w-7"
            style={{ backgroundColor: primaryColor }}
          />
        </div>
      </div>
      {preview === "masonry" ? (
        <div className="p-3" style={{ backgroundColor: accentColor }}>
          <div
            className="mb-3 h-5 w-2/3"
            style={{
              backgroundColor: textColor,
              fontFamily: `'${headingFont}', serif`,
            }}
          />
          <div className="grid grid-cols-3 items-start gap-2">
            {imageCells.map((height, index) => (
              <div
                key={index}
                className={`${height} ${index % 2 ? "bg-black/65" : "bg-black/90"}`}
                style={{ borderRadius: radius }}
              />
            ))}
          </div>
        </div>
      ) : preview === "terminal" ? (
        <div
          className="grid gap-3 p-4 sm:grid-cols-[1.1fr_0.9fr]"
          style={{ backgroundColor: accentColor }}
        >
          <div className="flex flex-col gap-2" style={{ alignItems }}>
            <div className="h-3 w-4/5" style={{ backgroundColor: textColor }} />
            <div className="h-1.5 w-full bg-white/80" />
            <div className="h-1.5 w-3/4 bg-white/80" />
            <div
              className="mt-2 h-5 w-16"
              style={{ backgroundColor: primaryColor, borderRadius: radius }}
            />
          </div>
          <div className="rounded bg-slate-950 p-3">
            <div className="mb-3 flex gap-1">
              <span className="size-1.5 rounded-full bg-red-400" />
              <span className="size-1.5 rounded-full bg-amber-300" />
              <span className="size-1.5 rounded-full bg-green-400" />
            </div>
            <div className="h-1 w-4/5 bg-blue-300" />
            <div className="mt-2 h-1 w-3/5 bg-green-300" />
            <div className="mt-2 h-1 w-2/5 bg-white/40" />
          </div>
        </div>
      ) : (
        <>
          <div
            className={`flex flex-col gap-3 p-5 ${preview === "magazine" ? "items-center text-center" : "items-start"}`}
            style={{
              alignItems: preview === "magazine" ? "center" : alignItems,
              backgroundColor: accentColor,
            }}
          >
            <div
              className="h-4 w-3/4"
              style={{
                backgroundColor: textColor,
                borderRadius: radius,
                fontFamily: `'${headingFont}', serif`,
              }}
            />
            <div className="h-1.5 w-full bg-white/75" />
            <div className="h-1.5 w-4/5 bg-white/75" />
            <div
              className="h-6 w-20"
              style={{ backgroundColor: primaryColor, borderRadius: radius }}
            />
          </div>
          <div
            className={`grid gap-2 p-3 ${preview === "case-study" ? "grid-cols-2" : "grid-cols-3"}`}
          >
            {imageCells
              .slice(0, preview === "case-study" ? 4 : 3)
              .map((_, index) => (
                <div
                  key={index}
                  className={`bg-muted ${preview === "case-study" && index === 0 ? "col-span-2 h-16" : "h-12"}`}
                  style={{ borderRadius: radius }}
                />
              ))}
          </div>
        </>
      )}
      <div
        className={`border-t px-4 py-3 ${layout?.footerStyle === "centered" ? "flex justify-center" : "flex justify-between"}`}
        style={{ borderColor: `${primaryColor}22`, backgroundColor: textColor }}
      >
        <span className="h-1.5 w-12 bg-white/70" />
        {layout?.footerStyle !== "minimal" ? (
          <span className="h-1.5 w-20 bg-white/35" />
        ) : null}
      </div>
    </div>
  );
}
