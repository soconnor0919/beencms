import { cmsInfo } from "~/config/cms";
import { cn } from "~/lib/utils";

interface CmsBrandProps {
  compact?: boolean;
  showCompany?: boolean;
  className?: string;
}

export function CmsBrand({ compact = false, showCompany = false, className }: CmsBrandProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)} aria-label={cmsInfo.name}>
      <svg
        aria-hidden="true"
        viewBox="0 0 36 36"
        className={cn("shrink-0", compact ? "size-7" : "size-9")}
      >
        <rect width="36" height="36" rx="10" fill="#0b1f3a" />
        <path d="M10 9v18M26 9v18" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        <path d="M11.5 21.5 24.5 14.5" stroke="#4f8cff" strokeWidth="4" strokeLinecap="round" />
      </svg>

      {compact ? null : (
        <span className="flex min-w-0 flex-col text-left leading-none">
          <span className="whitespace-nowrap text-[17px] font-bold tracking-[-0.035em] text-[#0b1f3a] dark:text-white">
            hadlock<span className="text-[#377cf6]">CMS</span>
          </span>
          {showCompany ? (
            <span className="mt-1 whitespace-nowrap text-[8px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              by Hadlock Technologies
            </span>
          ) : null}
        </span>
      )}
    </span>
  );
}
