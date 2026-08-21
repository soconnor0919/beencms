import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { headers } from "next/headers";
import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import BlockRenderer from "~/components/BlockRenderer";
import type { Block } from "~/lib/blocks";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const ctx = await createTRPCContext({ headers: await headers() });
  const item = await createCaller(ctx).companies.getBySlug({ slug });
  return item ? { title: item.seoTitle ?? item.name, description: item.seoDescription ?? item.description, alternates: item.canonical ? { canonical: item.canonical } : undefined, robots: item.noIndex ? { index: false, follow: false } : undefined, openGraph: { title: item.seoTitle ?? item.name, description: item.seoDescription ?? item.description ?? undefined, images: item.ogImage || item.imageUrl ? [item.ogImage ?? item.imageUrl!] : undefined } } : {};
}

export default async function ProgramDetailPage({ params }: Props) {
  const { slug } = await params;
  const ctx = await createTRPCContext({ headers: await headers() });
  const caller = createCaller(ctx);
  const { isEnabled: isDraft } = await draftMode();

  const [company, publishedPageData] = await Promise.all([
    caller.companies.getBySlug({ slug }),
    caller.companyPage.getBySlug({ slug }),
  ]);

  if (!company) {
    const moved = await caller.redirects.get({ fromPath: `/programs/${slug}` });
    if (moved) redirect(moved.toPath);
    notFound();
  }

  // Resolve blocks from draft or live layout
  let blocks: Block[] = [];
  try {
    let pageData = publishedPageData;
    let draftLayout: string | null = null;
    if (isDraft) {
      try {
        const preview = await caller.companyPage.getDraftBySlug({ slug });
        if (preview) {
          pageData = preview;
          draftLayout = preview.draftLayout;
        }
      } catch {
        // A stale draft cookie without an editor session falls back to published content.
      }
    }
    const draft = draftLayout ? JSON.parse(draftLayout) as Block[] : null;
    const live = pageData?.layout ? JSON.parse(pageData.layout) as Block[] : [];
    blocks = draft ?? live;
  } catch {
    blocks = [];
  }

  return (
    <>
      {/* Program hero — uses company data as a base */}
      <section className="bg-cream dark:bg-muted px-6 py-20">
        <div className="mx-auto max-w-4xl">
          {/* Cover image */}
          {company.imageUrl && (
            <div className="mb-8 overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={company.imageUrl}
                alt={company.name}
                className="h-64 w-full object-cover md:h-80"
              />
            </div>
          )}

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              {company.status === "coming_soon" && (
                <span className="mb-3 inline-block rounded-full bg-olive/10 px-3 py-1 text-xs font-medium text-olive">
                  Coming Soon
                </span>
              )}
              <h1 className="font-serif text-4xl font-bold text-charcoal dark:text-foreground md:text-5xl">
                {company.name}
              </h1>
              {company.tagline && (
                <p className="mt-2 text-lg font-medium text-olive">{company.tagline}</p>
              )}
            </div>
          </div>

          {company.description && (
            <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl">
              {company.description}
            </p>
          )}
        </div>
      </section>

      {/* Block-based page content */}
      {blocks.length > 0 && <BlockRenderer blocks={blocks} />}

      {/* Default CTA if no blocks */}
      {blocks.length === 0 && (
        <section className="px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-muted-foreground">
              More details about {company.name} coming soon.
            </p>
          </div>
        </section>
      )}
    </>
  );
}
