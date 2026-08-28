import type { Metadata } from "next";
import { cmsInfo } from "~/config/cms";

export const metadata: Metadata = {
  title: {
    default: `${cmsInfo.name} Admin`,
    template: `%s | ${cmsInfo.name}`,
  },
  icons: { icon: "/branding/hadlock/icon-blue.svg" },
  robots: { index: false, follow: false },
};

export default function AdminGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
