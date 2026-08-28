import { appDefaults } from "~/config/cms";

interface LogoProps {
  width?: number;
  className?: string;
  variant?: "full" | "icon";
  src?: string | null;
  alt?: string;
}

export default function Logo({
  width = 200,
  className = "",
  variant = "full",
  src: customSrc,
  alt = appDefaults.name,
}: LogoProps) {
  if (!customSrc) {
    return (
      <span
        className={`inline-flex truncate font-display font-semibold text-foreground ${className}`}
        style={{ maxWidth: width }}
      >
        {alt}
      </span>
    );
  }
  const src = customSrc;
  const height = Math.round(
    width * (variant === "icon" ? 498 / 363 : 504 / 1444),
  );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
    />
  );
}
