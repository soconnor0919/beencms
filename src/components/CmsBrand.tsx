import { cmsInfo } from "~/config/cms";
import { cn } from "~/lib/utils";

interface CmsBrandProps {
  compact?: boolean;
  showCompany?: boolean;
  className?: string;
}

export function CmsBrand({
  compact = false,
  showCompany = false,
  className,
}: CmsBrandProps) {
  if (compact) {
    return (
      <span
        className={cn("inline-flex items-center", className)}
        aria-label={cmsInfo.name}
      >
        {/* The blue and white marks are the canonical Hadlock Technologies assets. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/branding/hadlock/icon-blue.svg"
          alt=""
          className="size-8 dark:hidden"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/branding/hadlock/icon-white.svg"
          alt=""
          className="hidden size-8 dark:block"
        />
      </span>
    );
  }

  return (
    <span
      className={cn("inline-flex min-w-0 items-center gap-2.5", className)}
      aria-label={`${cmsInfo.name} by ${cmsInfo.company}`}
    >
      {showCompany ? (
        <>
          <span className="relative block h-7 w-[121px] shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/branding/hadlock/logo-blue.svg"
              alt=""
              className="h-7 w-[121px] object-contain dark:hidden"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/branding/hadlock/logo-white.svg"
              alt=""
              className="hidden h-7 w-[121px] object-contain dark:block"
            />
          </span>
          <span className="rounded-sm border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-display text-[10px] font-bold tracking-[0.16em] text-primary">
            CMS
          </span>
        </>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/branding/hadlock/icon-blue.svg"
            alt=""
            className="size-8 dark:hidden"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/branding/hadlock/icon-white.svg"
            alt=""
            className="hidden size-8 dark:block"
          />
          <span className="whitespace-nowrap font-display text-lg font-bold tracking-tight text-foreground">
            hadlock<span className="text-primary">CMS</span>
          </span>
        </>
      )}
    </span>
  );
}
