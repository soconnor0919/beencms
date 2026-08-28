import type { Metadata } from "next";
import { cmsInfo } from "~/config/cms";

export const metadata: Metadata = {
  title: `Sign in | ${cmsInfo.name}`,
  icons: { icon: "/branding/hadlock/icon-blue.svg" },
  robots: { index: false, follow: false },
};

export default function AdminLoginGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div data-platform-shell>{children}</div>;
}
