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
  const src = customSrc || (variant === "icon" ? "/icon.svg" : "/logo.svg");
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
