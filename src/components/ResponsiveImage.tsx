import type { CSSProperties, ImgHTMLAttributes } from "react";

export function responsiveMediaSources(src: string) {
  const [path, suffix = ""] = src.split(/(?=[?#])/s, 2);
  if (!path?.includes("/uploads/") || !path.endsWith("/large.webp"))
    return null;
  const base = path.slice(0, -"large.webp".length);
  return {
    avif: `${base}avif.avif${suffix}`,
    webp: [
      `${base}small.webp${suffix} 640w`,
      `${base}medium.webp${suffix} 1280w`,
      `${base}large.webp${suffix} 1920w`,
      `${base}original.webp${suffix} 3840w`,
    ].join(", "),
  };
}

export default function ResponsiveImage({
  src,
  alt,
  sizes = "100vw",
  focalX,
  focalY,
  style,
  width = 1600,
  height = 900,
  ...props
}: Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string;
  focalX?: number;
  focalY?: number;
}) {
  const sources = responsiveMediaSources(src);
  const focalStyle: CSSProperties | undefined =
    focalX === undefined || focalY === undefined
      ? style
      : {
          ...style,
          objectPosition: `${Math.max(0, Math.min(100, focalX))}% ${Math.max(0, Math.min(100, focalY))}%`,
        };
  return (
    <picture>
      {sources ? <source type="image/avif" srcSet={sources.avif} /> : null}
      {sources ? (
        <source type="image/webp" srcSet={sources.webp} sizes={sizes} />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        style={focalStyle}
        {...props}
      />
    </picture>
  );
}
