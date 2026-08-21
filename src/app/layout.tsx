import "~/styles/globals.css";
import { type Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import { Suspense } from "react";
import { TRPCReactProvider } from "~/trpc/react";
import { Toaster } from "~/components/ui/sonner";
import { ThemeProvider } from "~/components/ThemeProvider";
import { ThemeInjector } from "~/components/ThemeInjector";
import { db } from "~/server/db";
import { siteSettings } from "~/server/db/schema";
import { appDefaults } from "~/config/cms";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { resolvePublicSiteId } from "~/lib/sites";

export async function generateMetadata(): Promise<Metadata> {
  const siteId = await resolvePublicSiteId(await headers());
  let row:
    | {
        siteName: string;
        seoTitle: string | null;
        seoDescription: string | null;
        iconUrl: string | null;
        siteUrl: string | null;
      }
    | undefined;

  try {
    row = await db
      .select({
        siteName: siteSettings.siteName,
        seoTitle: siteSettings.seoTitle,
        seoDescription: siteSettings.seoDescription,
        iconUrl: siteSettings.iconUrl,
        siteUrl: siteSettings.siteUrl,
      })
      .from(siteSettings)
      .where(eq(siteSettings.siteId, siteId))
      .get();
  } catch {
    // DB not ready during build — use static defaults.
  }

  const title = row?.seoTitle ?? row?.siteName ?? appDefaults.name;
  const description = row?.seoDescription ?? appDefaults.description;
  const icons: Metadata["icons"] = row?.iconUrl
    ? [{ rel: "icon", url: row.iconUrl }]
    : [
        { rel: "icon", url: "/icon.svg", type: "image/svg+xml" },
        { rel: "icon", url: "/favicon.ico" },
      ];

  return {
    title,
    description,
    icons,
    metadataBase: row?.siteUrl ? new URL(row.siteUrl) : undefined,
    openGraph: { title, description, type: "website" },
  };
}

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "600", "700"],
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const siteId = await resolvePublicSiteId(await headers());
  const organization = db
    .select({
      siteName: siteSettings.siteName,
      siteUrl: siteSettings.siteUrl,
      themePreset: siteSettings.themePreset,
    })
    .from(siteSettings)
    .where(eq(siteSettings.siteId, siteId))
    .get();
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: organization?.siteName ?? appDefaults.name,
    url: organization?.siteUrl ?? process.env.BETTER_AUTH_URL,
  };
  return (
    <html
      lang="en"
      className={sourceSans.variable}
      data-site-theme={organization?.themePreset ?? "trellis"}
      suppressHydrationWarning
    >
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        {/*
          Reads DB-configured primary/accent colors and injects a :root {}
          override so the live site immediately reflects Settings > Branding
          color changes. Suspense fallback is null (globals.css defaults
          render instantly from the static stylesheet).
        */}
        <Suspense fallback={null}>
          <ThemeInjector />
        </Suspense>
        <ThemeProvider>
          <TRPCReactProvider>{children}</TRPCReactProvider>
          <Toaster richColors position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
